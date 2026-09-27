import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const createdAt = "2026-01-01T00:00:00.000Z";
const user = (id) => ({ id, name: `Member ${id}`, email: `${id}@example.test`, emailVerified: true, role: "user", banned: false, createdAt });
const report = (id) => ({
  id, pollSlug: `poll-${id}`, reason: "spam", details: "Test report", createdAt, status: "pending",
  poll: { question: `Reported poll ${id}`, slug: `poll-${id}`, totalVotes: 0, status: "active", options: [], deleted: false },
});
const action = (id) => ({
  id, actorName: "Reviewing staff", actorRole: "moderator", action: "poll_edited", note: `History note ${id}`,
  changedFields: ["category"], before: { category: "Tech" }, after: { category: "Food" }, createdAt,
});
const respond = (route, body, status = 200) => route.fulfill({ status, json: body });

async function staffSession(page, handle) {
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/get-session") return respond(route, {
      user: { id: "staff", name: "Staff", email: "staff@example.test", emailVerified: true, role: "admin", twoFactorEnabled: true },
      session: { id: "session", createdAt, expiresAt: new Date(Date.now() + 86400_000).toISOString() },
    });
    if (url.pathname === "/api/account/security") return respond(route, { enabled: true, staff: true, verified: true, staffSessionExpired: false });
    if (url.pathname === "/api/moderation/recovery") return respond(route, { requests: [], nextCursor: null });
    return handle(route, url);
  });
}

test("report navigation retries the same cursor and resets it when changing queues", async ({ page }) => {
  const queries = [];
  let fail = true;
  await staffSession(page, (route, url) => {
    if (url.pathname !== "/api/moderation/reports") return respond(route, {});
    const cursor = url.searchParams.get("cursor");
    const status = url.searchParams.get("status");
    queries.push({ cursor, status });
    if (cursor && fail) { fail = false; return respond(route, { message: "Temporary report failure" }, 503); }
    return respond(route, { reports: [report(status === "resolved" ? "resolved" : cursor ? "older" : "newer")], role: "admin", nextCursor: cursor || status === "resolved" ? null : "report-next" });
  });
  await page.goto("/moderation");
  await expect(page.getByRole("heading", { name: "Reported poll newer" })).toBeVisible();
  await page.getByRole("navigation", { name: "Moderation pages" }).getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reports unavailable" })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Reported poll older" })).toBeVisible();
  expect(queries.slice(0, 3).map((query) => query.cursor)).toEqual([null, "report-next", "report-next"]);
  await page.getByRole("button", { name: "resolved", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reported poll resolved" })).toBeVisible();
  expect(queries.at(-1)).toEqual({ cursor: null, status: "resolved" });
  // Re-selecting the current queue must refresh, not leave a loading skeleton.
  await page.getByRole("button", { name: "resolved", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reported poll resolved" })).toBeVisible();
});

test("report history is lazy, paginated, accessible and retryable with before/after snapshots", async ({ page }) => {
  const cursors = [];
  let fail = true;
  await staffSession(page, (route, url) => {
    if (url.pathname === "/api/moderation/reports") return respond(route, { reports: [report("one")], role: "admin", nextCursor: null });
    if (url.pathname === "/api/moderation/reports/one/history") {
      const cursor = url.searchParams.get("cursor");
      cursors.push(cursor);
      if (cursor && fail) { fail = false; return respond(route, { message: "Temporary history failure" }, 503); }
      return respond(route, { actions: [action(cursor ? "old" : "new")], nextCursor: cursor ? null : "history-next" });
    }
    return respond(route, {});
  });
  await page.goto("/moderation");
  const toggle = page.getByRole("button", { name: "Action history", exact: true });
  await expect(toggle).toBeVisible();
  expect(cursors).toEqual([]);
  await toggle.click();
  await expect(page.getByText("History note new", { exact: true })).toBeVisible();
  await page.getByText("View recorded change", { exact: true }).click();
  await expect(page.getByText('"Tech"', { exact: false })).toBeVisible();
  await expect(page.getByText('"Food"', { exact: false })).toBeVisible();
  const panelId = await toggle.getAttribute("aria-controls");
  const scan = await new AxeBuilder({ page }).include(`[id="${panelId}"]`).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(scan.violations).toEqual([]);
  await page.getByRole("navigation", { name: "Action history pages" }).getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Temporary history failure" })).toBeVisible();
  await page.getByRole("button", { name: "Retry history" }).click();
  await expect(page.getByText("History note old", { exact: true })).toBeVisible();
  await expect(page.getByText("History note new", { exact: true })).toHaveCount(0);
  expect(cursors).toEqual([null, "history-next", "history-next"]);
  await page.getByRole("navigation", { name: "Action history pages" }).getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByText("History note new", { exact: true })).toBeVisible();
  expect(cursors.at(-1)).toBe(null);
});

test("account search resets cursors and both account and global audit histories are available", async ({ page }) => {
  const queries = [];
  await staffSession(page, (route, url) => {
    if (url.pathname === "/api/moderation/users") {
      queries.push(Object.fromEntries(url.searchParams));
      const cursor = url.searchParams.get("cursor");
      const search = url.searchParams.get("q");
      return respond(route, { users: [user(search ? "match" : cursor ? "older" : "newer")], nextCursor: search || cursor ? null : "user-next", selfId: "staff" });
    }
    if (url.pathname === "/api/moderation/users/match/history") return respond(route, { actions: [action("account")], nextCursor: null });
    if (url.pathname === "/api/moderation/history") return respond(route, { actions: [{ ...action("retained"), actorName: "Deleted user", targetUserId: null }], nextCursor: null });
    return respond(route, {});
  });
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Member newer" })).toBeVisible();
  await page.getByRole("navigation", { name: "User pages" }).getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Member older" })).toBeVisible();
  await page.getByLabel("Search accounts").fill("match");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Member match" })).toBeVisible();
  expect(queries.at(-1)).toEqual({ field: "name", q: "match" });
  expect(queries.every((query) => !query.page)).toBe(true);
  await page.getByRole("button", { name: "Account action history" }).click();
  await expect(page.getByText("History note account", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Complete moderation audit log" }).click();
  await expect(page.getByText("History note retained", { exact: true })).toBeVisible();
  await expect(page.getByText("Deleted user", { exact: true })).toBeVisible();
});

test("changing accounts clears private audit history before the new staff check finishes", async ({ page }) => {
  let switched = false;
  let releaseCheck;
  const check = new Promise((resolve) => { releaseCheck = resolve; });
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/get-session") return respond(route, {
      user: { id: switched ? "other-user" : "staff", name: "Test member", email: "member@example.test", emailVerified: true, role: switched ? "user" : "admin" },
      session: { id: switched ? "other-session" : "staff-session", expiresAt: new Date(Date.now() + 86400_000).toISOString() },
    });
    if (path === "/api/account/security") {
      if (switched) await check;
      return respond(route, { enabled: !switched, staff: !switched, verified: !switched });
    }
    if (path === "/api/moderation/users") return respond(route, { users: [], nextCursor: null, selfId: "staff" });
    if (path === "/api/moderation/recovery") return respond(route, { requests: [], nextCursor: null });
    if (path === "/api/moderation/history") return respond(route, { actions: [action("private")], nextCursor: null });
    return respond(route, {});
  });
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "Complete moderation audit log" }).click();
  await expect(page.getByText("History note private", { exact: true })).toBeVisible();
  switched = true;
  try {
    const refreshed = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/auth/get-session");
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await refreshed;
    await expect(page.getByText("History note private", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Checking staff access…", { exact: true })).toBeVisible();
  } finally { releaseCheck(); }
  await expect(page.getByRole("heading", { name: "Verify staff access" })).toBeVisible();
});
