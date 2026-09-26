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
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body;
    if (path === "/api/auth/get-session") body = session;
    else if (path === "/api/account/security") body = { staff, enabled, verified, staffSessionExpired: false };
    else if (path === "/api/account/security/sessions") body = { sessions: [{ id: "current", current: true, device: "Test browser", createdAt: session.session.createdAt }] };
    else if (path === "/api/account/security/enable") body = { totpURI: "otpauth://totp/WDYT:test?secret=JBSWY3DPEHPK3PXP&issuer=WDYT", backupCodes: ["code1-code1", "code2-code2"] };
    else if (path === "/api/account/security/verify") { enabled = true; verified = true; session.user.twoFactorEnabled = true; body = { message: "Security verification complete" }; }
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
