import { test, expect } from "@playwright/test";
import { poll } from "../fixtures/poll.mjs";

async function mockVoting(page, options = {}) {
  const state = { optionId: null, lookupFails: false, dropResponse: false, submissions: 0, userId: "first-user", publicPoll: structuredClone(poll), resultReads: 0, resultsFail: false, ...options };
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    let status = 200;
    if (path === "/api/auth/get-session") body = state.userId ? {
      user: { id: state.userId, name: "Test Member", email: "member@example.test", emailVerified: true, role: "user" },
      session: { id: "session", expiresAt: new Date(Date.now() + 86400000).toISOString() },
    } : null;
    else if (path.endsWith("/my-vote")) {
      status = state.lookupFails ? 503 : 200;
      body = state.lookupFails ? { message: "Test outage" } : { optionId: state.optionId };
    } else if (path.endsWith("/votes")) {
      state.submissions += 1;
      state.optionId = route.request().postDataJSON().optionId;
      if (state.dropResponse) { state.dropResponse = false; return route.abort("failed"); }
      body = { poll, replayed: state.submissions > 1 };
    } else if (path === `/api/polls/${poll.id}`) {
      state.resultReads += 1;
      status = state.resultsFail ? 503 : 200;
      body = state.resultsFail ? { message: "Test outage" } : { poll: state.publicPoll };
    }
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  return state;
}

test("poll questions are server-rendered and personal votes come from the current account", async ({ page, request }) => {
  const html = await (await request.get(`/poll/${poll.id}`)).text();
  expect(html).toMatch(/<h1[^>]*>Which test choice do you prefer\?<\/h1>/);
  const state = await mockVoting(page, { optionId: poll.options[0].id });
  await page.addInitScript(() => localStorage.setItem("voted:browser-vote", "another-persons-choice"));
  await page.goto(`/poll/${poll.id}`);
  await expect(page.getByText("Your vote is recorded", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("voted:browser-vote"))).toBeNull();
  await page.getByRole("link", { name: "View results", exact: true }).click();
  await expect(page.getByText("Your vote", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(`/poll/${poll.id}/results`);

  // The same browser switches to a different account with no receipt.
  state.userId = "second-user";
  state.optionId = null;
  const lookup = page.waitForResponse((response) => response.url().endsWith("/my-vote"));
  await page.reload();
  await lookup;
  await expect(page.getByText("Checking your vote…", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Your vote", { exact: true })).toHaveCount(0);
  await page.goto(`/poll/${poll.id}`);
  await expect(page.getByRole("radio", { name: "First choice" })).toBeEnabled();
  await expect(page.getByText("Your vote is recorded", { exact: true })).toHaveCount(0);
});

test("vote lookup failures are recoverable and do not permit an unchecked submission", async ({ page }) => {
  const state = await mockVoting(page, { lookupFails: true });
  await page.goto(`/poll/${poll.id}`);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Could not check your vote");
  await expect(page.getByRole("button", { name: "Submit Vote" })).toBeDisabled();
  await expect(page.getByRole("radio", { name: "First choice" })).toBeDisabled();
  state.lookupFails = false;
  await page.getByRole("button", { name: "Retry vote check" }).click();
  await page.getByRole("radio", { name: "First choice" }).check();
  await expect(page.getByRole("button", { name: "Submit Vote" })).toBeEnabled();
  expect(state.submissions).toBe(0);
});

test("a lost vote response can be retried without putting the answer in browser storage or URLs", async ({ page }) => {
  const state = await mockVoting(page, { dropResponse: true });
  await page.goto(`/poll/${poll.id}`);
  await page.getByRole("radio", { name: "Second choice" }).check();
  await page.getByRole("button", { name: "Submit Vote" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Submit Vote" }).click();
  await expect(page).toHaveURL(`/poll/${poll.id}/results`);
  await expect(page.getByText("Your vote", { exact: true })).toBeVisible();
  expect(state.submissions).toBe(2);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("voted:")))).toEqual([]);
});

test("public results remain available when the private vote lookup fails", async ({ page }) => {
  await mockVoting(page, { lookupFails: true });
  await page.goto(`/poll/${poll.id}/results`);
  await expect(page.getByRole("heading", { level: 1, name: poll.question })).toBeVisible();
  await expect(page.getByRole("region", { name: "Poll results" })).toBeVisible();
  await expect(page.getByText("Your vote", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Your personal vote is temporarily unavailable/)).toBeVisible();
});

test("live results refresh, recover after outages and pause while the tab is hidden", async ({ page }) => {
  const state = await mockVoting(page);
  await page.clock.install();
  await page.goto(`/poll/${poll.id}/results`);
  await expect(page.getByText(/0 total votes/)).toBeVisible();
  state.publicPoll.totalVotes = 3;
  state.publicPoll.options[0].votes = 3;
  await page.clock.runFor(10_000);
  await expect(page.getByText(/3 total votes/)).toBeVisible();
  state.resultsFail = true;
  await page.clock.runFor(10_000);
  await expect(page.getByText(/Updates are temporarily unavailable/)).toBeVisible();
  await expect(page.getByText(/3 total votes/)).toBeVisible();
  state.resultsFail = false;
  state.publicPoll.totalVotes = 4;
  state.publicPoll.options[0].votes = 4;
  await page.clock.runFor(10_000);
  await expect(page.getByText(/4 total votes/)).toBeVisible();
  await expect(page.getByText(/Updates are temporarily unavailable/)).toHaveCount(0);
  await page.evaluate(() => Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }));
  const before = state.resultReads;
  await page.clock.runFor(20_000);
  expect(state.resultReads).toBe(before);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => state.resultReads).toBe(before + 1);
});
