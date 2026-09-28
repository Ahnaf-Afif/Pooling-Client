import { test, expect } from "@playwright/test";
import { poll } from "../fixtures/poll.mjs";

const storageKey = "wdyt.pending-commands.v1";
const session = (id = "owner") => ({
  user: { id, name: "Member", email: `${id}@example.test`, emailVerified: true, role: "admin", twoFactorEnabled: true },
  session: { id: `session-${id}`, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400_000).toISOString() },
});
async function fillPoll(page, question = "Which private test option do you prefer?") {
  await page.getByLabel("Question", { exact: true }).fill(question);
  await page.getByLabel("Option 1", { exact: true }).fill("First choice");
  await page.getByLabel("Option 2", { exact: true }).fill("Second choice");
}
const confirmed = (route, json) => route.fulfill({ json, headers: { "Idempotency-Replayed": "true" } });

test("a lost create response retries the same command after reload and stores no form content", async ({ page }) => {
  const keys = [];
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/get-session") return route.fulfill({ json: session() });
    if (url.pathname === "/api/polls" && route.request().method() === "POST") {
      keys.push(route.request().headers()["idempotency-key"]);
      expect(route.request().headers()["x-command-actor"]).toBe("owner");
      if (keys.length === 1) return route.abort("failed");
      return confirmed(route, { poll });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto("/create");
  await fillPoll(page);
  await page.getByRole("button", { name: "Publish Poll" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  const stored = await page.evaluate((key) => sessionStorage.getItem(key), storageKey);
  expect(stored).not.toContain("private test option");
  expect(stored).not.toContain("First choice");
  expect(stored).not.toContain("owner");
  await page.reload();
  await fillPoll(page);
  await page.getByRole("button", { name: "Publish Poll" }).click();
  await expect(page.getByRole("heading", { name: "Your poll is live" })).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toMatch(/^[a-f0-9-]{36}$/);
  expect(keys[1]).toBe(keys[0]);
  expect(await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), storageKey)).toEqual([]);
  // After confirmed success, identical content represents a new intentional post.
  await page.goto("/create");
  await fillPoll(page);
  await page.getByRole("button", { name: "Publish Poll" }).click();
  await expect(page.getByRole("heading", { name: "Your poll is live" })).toBeVisible();
  expect(keys[2]).not.toBe(keys[0]);
});

test("uncertain creates are isolated by changed content and the signed-in account", async ({ page }) => {
  const submissions = [];
  let actor = "owner";
  await page.route("**/api/**", (route) => {
    if (new URL(route.request().url()).pathname === "/api/auth/get-session") return route.fulfill({ json: session(actor) });
    if (route.request().method() === "POST") {
      submissions.push(route.request().headers());
      return route.fulfill({ status: 503, json: { message: "Temporary failure" } });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto("/create");
  await fillPoll(page);
  await page.getByRole("button", { name: "Publish Poll" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Temporary failure");
  await fillPoll(page, "A changed private test question?");
  await page.getByRole("button", { name: "Publish Poll" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Temporary failure");
  actor = "another-owner";
  await page.reload();
  await fillPoll(page);
  await page.getByRole("button", { name: "Publish Poll" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Temporary failure");
  expect(new Set(submissions.map((headers) => headers["idempotency-key"])).size).toBe(3);
  expect(submissions[2]["x-command-actor"]).toBe("another-owner");
});

test("malformed successful responses do not clear the pending create key", async ({ page }) => {
  const keys = [];
  await page.route("**/api/**", (route) => {
    if (new URL(route.request().url()).pathname === "/api/auth/get-session") return route.fulfill({ json: session() });
    if (route.request().method() === "POST") {
      keys.push(route.request().headers()["idempotency-key"]);
      if (keys.length === 1) return route.fulfill({ status: 200, contentType: "text/html", body: "<p>Invalid proxy response</p>" });
      return confirmed(route, { poll });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto("/create");
  await fillPoll(page);
  await page.getByRole("button", { name: "Publish Poll" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("unreadable response");
  await page.getByRole("button", { name: "Publish Poll" }).click();
  await expect(page.getByRole("heading", { name: "Your poll is live" })).toBeVisible();
  expect(keys[1]).toBe(keys[0]);
});

test("moderation notes retain their command key through an uncertain response", async ({ page }) => {
  const keys = [];
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/get-session") return route.fulfill({ json: session("staff") });
    if (path === "/api/account/security") return route.fulfill({ json: { enabled: true, staff: true, verified: true, staffSessionExpired: false } });
    if (path === "/api/moderation/reports") return route.fulfill({ json: { role: "admin", nextCursor: null, reports: [{
      id: "report", pollSlug: poll.id, poll, reason: "spam", status: "pending", createdAt: poll.createdAt,
    }] } });
    if (path.endsWith("/notes")) {
      keys.push(route.request().headers()["idempotency-key"]);
      if (keys.length === 1) return route.abort("failed");
      return confirmed(route, { action: { id: "one-audit-entry" } });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto("/moderation");
  await page.getByLabel("Internal note").fill("Private moderation context");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  expect(await page.evaluate((key) => sessionStorage.getItem(key), storageKey)).not.toContain("Private moderation");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByLabel("Internal note")).toHaveValue("");
  expect(keys[1]).toBe(keys[0]);
});
