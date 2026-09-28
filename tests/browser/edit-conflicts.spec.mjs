import { test, expect } from "@playwright/test";
import { poll as samplePoll } from "../fixtures/poll.mjs";

const poll = { ...samplePoll, id: "revision-poll", slug: "revision-poll", contentRevision: 0 };
const session = { user: { id: "editor", name: "Editor", email: "editor@example.test", role: "admin", emailVerified: true, twoFactorEnabled: true },
  session: { id: "editor-session", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400_000).toISOString() } };
const changed = (route) => route.fulfill({ status: 409, json: { code: "POLL_CHANGED", message: "This poll was edited after you opened it. Your draft has not been saved. Reload the latest version before editing again." } });
const saved = (route, body) => route.fulfill({ json: body, headers: { "Idempotency-Replayed": "false" } });

test("owner conflict preserves the draft and reload requires confirmation", async ({ page }) => {
  let loads = 0;
  const revisions = [];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/get-session") return route.fulfill({ json: session });
    if (url.pathname === "/api/polls/mine/revision-poll" && route.request().method() === "GET") {
      loads += 1;
      return route.fulfill({ json: { poll: loads === 1 ? poll : { ...poll, question: "Latest owner question?", contentRevision: 1 } } });
    }
    if (url.pathname === "/api/polls/revision-poll" && route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      revisions.push(body.expectedRevision);
      if (revisions.length === 1) return changed(route);
      return route.fulfill({ json: { poll: { ...poll, question: body.question, contentRevision: 2 } } });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto("/my-polls/revision-poll");
  await page.getByLabel("Question", { exact: true }).fill("My unsaved owner draft?");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("edited after you opened it");
  await expect(page.getByLabel("Question", { exact: true })).toHaveValue("My unsaved owner draft?");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Discard draft and load latest" }).click();
  await expect(page.getByLabel("Question", { exact: true })).toHaveValue("My unsaved owner draft?");
  expect(loads).toBe(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Discard draft and load latest" }).click();
  await expect(page.getByLabel("Question", { exact: true })).toHaveValue("Latest owner question?");
  await page.getByLabel("Question", { exact: true }).fill("Fresh owner edit?");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Poll changes saved.")).toBeVisible();
  expect(revisions).toEqual([0, 1]);
});

test("direct moderation conflict preserves question and note until staff loads the latest poll", async ({ page }) => {
  let loads = 0;
  const revisions = [];
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/get-session") return route.fulfill({ json: session });
    if (path === "/api/account/security") return route.fulfill({ json: { enabled: true, staff: true, verified: true, staffSessionExpired: false } });
    if (path === "/api/moderation/polls/revision-poll" && route.request().method() === "GET") {
      loads += 1;
      return route.fulfill({ json: { poll: loads === 1 ? poll : { ...poll, question: "Latest moderated question?", contentRevision: 1 } } });
    }
    if (path === "/api/moderation/polls/revision-poll" && route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      revisions.push(body.expectedRevision);
      if (revisions.length === 1) return changed(route);
      return saved(route, { message: "Poll changes saved", poll: { ...poll, question: body.question, contentRevision: 2 }, action: { id: "record" } });
    }
    if (path.endsWith("/history")) return route.fulfill({ json: { actions: [], nextCursor: null } });
    return route.fulfill({ json: {} });
  });
  await page.goto("/moderation/polls/revision-poll");
  await page.getByLabel("Question", { exact: true }).fill("Unsaved moderator question?");
  await page.getByLabel("Reason for the edit").fill("Specific moderation reason");
  await page.getByRole("button", { name: "Save edit" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("edited after you opened it");
  await expect(page.getByLabel("Question", { exact: true })).toHaveValue("Unsaved moderator question?");
  await expect(page.getByLabel("Reason for the edit")).toHaveValue("Specific moderation reason");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Discard draft and load latest" }).click();
  await expect(page.getByLabel("Question", { exact: true })).toHaveValue("Latest moderated question?");
  await page.getByLabel("Question", { exact: true }).fill("Current moderator question?");
  await page.getByLabel("Reason for the edit").fill("Specific moderation reason");
  await page.getByRole("button", { name: "Save edit" }).click();
  await expect(page.getByText("Poll changes saved")).toBeVisible();
  expect(revisions).toEqual([0, 1]);
});

test("reported edit conflict keeps the report pending and its draft visible", async ({ page }) => {
  const revisions = [];
  let loads = 0;
  const report = { id: "reported", pollSlug: poll.slug, reason: "spam", status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z", poll };
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/get-session") return route.fulfill({ json: session });
    if (path === "/api/account/security") return route.fulfill({ json: { enabled: true, staff: true, verified: true, staffSessionExpired: false } });
    if (path === "/api/moderation/reports") return route.fulfill({ json: { role: "admin", reports: [report], nextCursor: null } });
    if (path === "/api/moderation/polls/revision-poll") {
      loads += 1;
      return route.fulfill({ json: { poll: { ...poll, question: "Latest reported question?", contentRevision: 1 } } });
    }
    if (path === "/api/moderation/reports/reported/poll") {
      const body = route.request().postDataJSON();
      revisions.push(body.expectedRevision);
      if (revisions.length === 1) return changed(route);
      return saved(route, { message: "Report resolved", action: { id: "record" } });
    }
    if (path.endsWith("/history")) return route.fulfill({ json: { actions: [], nextCursor: null } });
    return route.fulfill({ json: {} });
  });
  await page.goto("/moderation");
  await page.getByRole("button", { name: "Edit & resolve", exact: true }).click();
  await page.getByLabel("Question", { exact: true }).fill("Unsaved report draft?");
  await page.getByLabel("Reason for the edit").fill("Specific report decision");
  await page.getByRole("button", { name: "Save edit & resolve" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("edited after you opened it");
  await expect(page.getByLabel("Question", { exact: true })).toHaveValue("Unsaved report draft?");
  await expect(page.getByLabel("Reason for the edit")).toHaveValue("Specific report decision");
  await expect(page.getByRole("button", { name: "Edit & resolve", exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Discard draft and load latest" }).click();
  await expect(page.getByLabel("Question", { exact: true })).toHaveValue("Latest reported question?");
  await page.getByLabel("Question", { exact: true }).fill("Current report edit?");
  await page.getByLabel("Reason for the edit").fill("Specific report decision");
  await page.getByRole("button", { name: "Save edit & resolve" }).click();
  await expect(page.getByRole("button", { name: "Edit & resolve", exact: true })).toBeVisible();
  expect(loads).toBe(1);
  expect(revisions).toEqual([0, 1]);
});
