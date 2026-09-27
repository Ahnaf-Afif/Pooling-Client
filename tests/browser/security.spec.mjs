import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("sign-in configuration failures show a recoverable error", async ({ page }) => {
  await page.route("**/api/auth/get-session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "null" }));
  let unavailable = true;
  await page.route("**/api/auth-config", (route) => route.fulfill({
    status: unavailable ? 503 : 200, contentType: "application/json",
    body: JSON.stringify(unavailable ? { message: "Database unavailable" } : { google: true, magicLink: false }),
  }));
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Sign-in unavailable" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "temporarily unavailable" })).toBeVisible();
  unavailable = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

// Browser contract tests use local fixtures only. Transaction/auth enforcement
// is tested independently against a real temporary MongoDB replica set.
async function mockAccount(page, { staff = true, enabled = false } = {}) {
  const session = {
    user: { id: "test-user", name: "Test Member", email: "member@example.test", emailVerified: true, role: staff ? "admin" : "user", twoFactorEnabled: enabled },
    session: { id: "current", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86_400_000).toISOString() },
  };
  let verified = false;
  let recovery = null;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body;
    if (path === "/api/auth/get-session") body = session;
    else if (path === "/api/account/security") body = { staff, enabled, verified, staffSessionExpired: false, recovery };
    else if (path === "/api/account/security/sessions") body = { sessions: [{ id: "current", current: true, device: "Test browser", createdAt: session.session.createdAt }] };
    else if (path === "/api/account/security/enable") body = { totpURI: "otpauth://totp/WDYT:test?secret=JBSWY3DPEHPK3PXP&issuer=WDYT", backupCodes: ["code1-code1", "code2-code2"] };
    else if (path === "/api/account/security/verify") { enabled = true; verified = true; session.user.twoFactorEnabled = true; body = { message: "Security verification complete" }; }
    else if (path === "/api/account/security/recovery-codes") { verified = false; body = { backupCodes: ["new01-new01", "new02-new02"], message: "Old codes no longer work" }; }
    else if (path === "/api/account/security/recovery") { recovery = { requestId: "recovery-reference", status: "pending", expiresAt: new Date(Date.now() + 86400_000).toISOString() }; body = { recovery, message: "Recovery requested" }; }
    else if (path === "/api/account/security/recovery/cancel") { recovery = null; body = { message: "Pending recovery request cancelled" }; }
    else if (path === "/api/moderation/reports") body = { reports: [], role: "admin", pages: 1, page: 1, total: 0 };
    else body = {};
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

test("staff can enroll, save recovery codes and reach moderation", async ({ page }) => {
  await mockAccount(page);
  await page.goto("/moderation");
  await expect(page.getByRole("heading", { name: "Verify staff access" })).toBeVisible();
  await page.getByRole("link", { name: "Account security", exact: true }).click();
  await page.getByRole("button", { name: "Set up authenticator" }).click();
  await expect(page.getByText("code1-code1", { exact: true })).toBeVisible();
  await page.getByLabel("Authenticator code", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByText("Security verification complete", { exact: true })).toBeVisible();
  await expect(page.getByText("Enter a setup key manually")).toHaveCount(0);
  await page.getByRole("button", { name: "I saved my recovery codes" }).click();
  await expect(page.getByText("code1-code1", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Open moderation" }).click();
  await expect(page.getByRole("heading", { name: "Moderation", exact: true })).toBeVisible();
});

test("recovery-code replacement needs verification and never persists displayed codes", async ({ page }) => {
  await mockAccount(page, { enabled: true });
  await page.goto("/account");
  await expect(page.getByRole("button", { name: "Replace recovery codes" })).toBeDisabled();
  await page.getByLabel("Authenticator code", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Replace recovery codes" }).click();
  await expect(page.getByText("new01-new01", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Replace recovery codes" })).toBeDisabled();
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("new01-new01");
  expect(page.url()).not.toContain("new01");
  await page.getByRole("button", { name: "I saved my recovery codes" }).click();
  await expect(page.getByText("new01-new01", { exact: true })).toHaveCount(0);
});

test("lost-factor recovery shows a reference and permits cancellation without a factor", async ({ page }) => {
  await mockAccount(page, { enabled: true });
  await page.goto("/account");
  await page.getByText("Lost both your authenticator and recovery codes?", { exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Request authenticator recovery" }).click();
  await expect(page.getByText("recovery-reference", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel recovery request" }).click();
  await expect(page.getByText("recovery-reference", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Request authenticator recovery" })).toBeVisible();
});

test("admin recovery approval requires independent verification, a note and confirmation", async ({ page }) => {
  await mockAccount(page, { enabled: true });
  await page.route("**/api/moderation/users?**", (route) => route.fulfill({ json: { users: [], total: 0, page: 1, pages: 1, selfId: "admin" } }));
  let approved = false;
  await page.route("**/api/moderation/recovery", (route) => route.fulfill({ json: {
    requests: approved ? [] : [{ requestId: "test-request", name: "Requesting staff", email: "staff@example.test", self: false, expiresAt: new Date(Date.now() + 86400_000).toISOString() }], nextCursor: null,
  } }));
  await page.route("**/api/moderation/recovery/test-request/approve", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ identityConfirmed: true, note: "Verified in person using our known contact." });
    approved = true;
    await route.fulfill({ json: { message: "Recovery approved; sessions revoked" } });
  });
  await page.goto("/account");
  await page.getByLabel("Authenticator code", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByText("Security verification complete", { exact: true })).toBeVisible();
  await page.goto("/admin/users");
  const button = page.getByRole("button", { name: "Approve authenticator recovery" });
  await button.click();
  expect(approved).toBe(false);
  await page.getByLabel("Verification note (do not include secrets)").fill("Verified in person using our known contact.");
  await button.click();
  expect(approved).toBe(false);
  await page.getByRole("checkbox").check();
  page.once("dialog", (dialog) => dialog.accept());
  await button.click();
  await expect(page.getByText("Recovery approved; sessions revoked", { exact: true })).toBeVisible();
  await expect(button).toHaveCount(0);
});

test("security controls have accessible names and keyboard-operable form fields", async ({ page }) => {
  await mockAccount(page, { enabled: true });
  await page.goto("/account");
  await expect(page.getByLabel("Authenticator code", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Use a recovery code" }).click();
  await expect(page.getByLabel("Recovery code", { exact: true })).toBeVisible();
  const scan = await new AxeBuilder({ page }).include("#security").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(scan.violations).toEqual([]);
});

test("signed-out visitors see sign-in instead of account or moderation data", async ({ page }) => {
  await page.route("**/api/auth/get-session**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "null" }));
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Sign in required" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete account" })).toHaveCount(0);
});

test("signed-in return links reject external and normalized protocol-relative destinations", async ({ page }) => {
  await mockAccount(page, { staff: false });
  for (const returnTo of ["https://example.test", "//example.test", "/\\example.test", "/.//example.test", "/account/..//example.test", "/\t/example.test", "/sign-in"]) {
    await page.goto(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
    await expect(page.getByRole("link", { name: "Continue", exact: true })).toHaveAttribute("href", "/my-polls");
  }
  await page.goto(`/sign-in?returnTo=${encodeURIComponent("/account?tab=data#security")}`);
  await expect(page.getByRole("link", { name: "Continue", exact: true })).toHaveAttribute("href", "/account?tab=data#security");
});
