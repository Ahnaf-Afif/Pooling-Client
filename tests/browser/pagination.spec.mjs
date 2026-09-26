import { test, expect } from "@playwright/test";

// Only intercepted, local test data; no production API or public posts.
function poll(id, category = "Tech") {
  return {
    id, question: `Question ${id}?`, category, status: "active", totalVotes: 0,
    createdAt: "2026-09-20T12:00:00.000Z", trending: false,
    options: [{ id: "one", label: "One", votes: 0 }, { id: "two", label: "Two", votes: 0 }],
  };
}

function respond(route, body, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test("feed cursors keep existing cards and statistics, and reset on category change", async ({ page }) => {
  const requests = [];
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/get-session") return respond(route, null);
    if (url.pathname !== "/api/polls") return respond(route, {});
    requests.push(url.searchParams);
    if (url.searchParams.get("category") === "Food") {
      return respond(route, { polls: [poll("food", "Food")], nextCursor: null, stats: { activePolls: 31, totalVotes: 42, trending: 0, categories: 6 } });
    }
    if (url.searchParams.get("cursor")) {
      // A repeated row must not create a duplicate card. Later pages omit stats.
      return respond(route, { polls: [poll("first"), poll("second")], nextCursor: null });
    }
    return respond(route, { polls: [poll("first")], nextCursor: "feed-next", stats: { activePolls: 31, totalVotes: 42, trending: 0, categories: 6 } });
  });
  await page.goto("/");
  const cards = page.locator("#polls").getByRole("heading", { level: 3 });
  await expect(cards).toHaveText(["Question first?"]);
  await page.getByRole("button", { name: "Load more polls" }).click();
  await expect(cards).toHaveText(["Question first?", "Question second?"]);
  await expect(page.getByText("Statistics refresh about once a minute.")).toBeVisible();
  await expect(page.getByText("42", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Load more polls" })).toHaveCount(0);
  expect(requests.some((query) => query.get("cursor") === "feed-next")).toBe(true);
  expect(requests.every((query) => !query.has("page"))).toBe(true);
  await page.getByRole("button", { name: "Food", exact: true }).click();
  await expect(cards).toHaveText(["Question food?"]);
  expect(requests.at(-1).has("cursor")).toBe(false);
});

test("missing statistics do not masquerade as zero counts", async ({ page }) => {
  await page.route("**/api/auth/get-session**", (route) => respond(route, null));
  await page.route("**/api/polls?**", (route) => respond(route, { polls: [], nextCursor: null, stats: null }));
  await page.goto("/");
  await expect(page.getByText("Statistics are temporarily unavailable.")).toBeVisible();
});

test("My Polls preserves earlier pages on failure and retries the same cursor", async ({ page }) => {
  const cursors = [];
  let failNext = true;
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/get-session") return respond(route, {
      user: { id: "owner", name: "Test Owner", email: "owner@example.test", emailVerified: true, role: "user" },
      session: { id: "test-session", expiresAt: new Date(Date.now() + 86400000).toISOString() },
    });
    if (url.pathname !== "/api/polls/mine") return respond(route, {});
    const cursor = url.searchParams.get("cursor");
    cursors.push(cursor);
    if (!cursor) return respond(route, { polls: [poll("owned-first")], nextCursor: "owner-next" });
    if (failNext) { failNext = false; return respond(route, { message: "Temporary test failure" }, 503); }
    return respond(route, { polls: [poll("owned-first"), poll("owned-second")], nextCursor: null });
  });
  await page.goto("/my-polls");
  const first = page.getByRole("heading", { name: "Question owned-first?", exact: true });
  await expect(first).toBeVisible();
  await page.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(page.getByRole("heading", { name: "We couldn't load your polls" })).toBeVisible();
  await expect(first).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Question owned-second?", exact: true })).toBeVisible();
  await expect(first).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Load more", exact: true })).toHaveCount(0);
  expect(cursors).toEqual([null, "owner-next", "owner-next"]);
});
