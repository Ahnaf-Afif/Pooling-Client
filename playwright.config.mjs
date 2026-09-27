import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  webServer: [{
    command: "node tests/fixtures/api-server.mjs",
    url: "http://127.0.0.1:5199/api/health",
    reuseExistingServer: false,
  }, {
    command: "npm run start:standalone",
    env: { PORT: "3100", HOSTNAME: "127.0.0.1", API_INTERNAL_URL: "http://127.0.0.1:5199/api" },
    url: "http://127.0.0.1:3100/sign-in",
    reuseExistingServer: false,
    timeout: 60_000,
  }],
});
