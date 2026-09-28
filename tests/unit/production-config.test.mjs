import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { productionConfigErrors } from "../../scripts/check-production.mjs";

const valid = {
  VERCEL_ENV: "production",
  NEXT_PUBLIC_SUPPORT_EMAIL: "help@polling.example.org.bd",
  NEXT_PUBLIC_SITE_URL: "https://polling-client.vercel.app",
  NEXT_PUBLIC_API_URL: "/api",
  API_PROXY_TARGET: "https://pooling-server.vercel.app",
  API_INTERNAL_URL: "https://pooling-server.vercel.app/api",
};

test("preview builds are not blocked by production-only policy settings", () => {
  assert.deepEqual(productionConfigErrors({ VERCEL_ENV: "preview" }), []);
});

test("production builds require a non-placeholder support address and matching secure API origins", () => {
  assert.deepEqual(productionConfigErrors(valid), []);
  assert.match(productionConfigErrors({ ...valid, NEXT_PUBLIC_SUPPORT_EMAIL: "support@example.com" }).join(" "), /SUPPORT_EMAIL/);
  assert.match(productionConfigErrors({ ...valid, NEXT_PUBLIC_SUPPORT_EMAIL: "help@sub.example.org" }).join(" "), /SUPPORT_EMAIL/);
  assert.match(productionConfigErrors({ ...valid, NEXT_PUBLIC_SUPPORT_EMAIL: "" }).join(" "), /SUPPORT_EMAIL/);
  assert.match(productionConfigErrors({ ...valid, NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }).join(" "), /SITE_URL/);
  assert.match(productionConfigErrors({ ...valid, NEXT_PUBLIC_SITE_URL: "https://example.test" }).join(" "), /SITE_URL/);
  assert.match(productionConfigErrors({ ...valid, NEXT_PUBLIC_API_URL: "https://pooling-server.vercel.app/api" }).join(" "), /NEXT_PUBLIC_API_URL/);
  assert.match(productionConfigErrors({ ...valid, API_INTERNAL_URL: "https://other.example/api" }).join(" "), /API_INTERNAL_URL/);
  assert.match(productionConfigErrors({ ...valid, API_PROXY_TARGET: valid.NEXT_PUBLIC_SITE_URL }).join(" "), /must differ/);
});

test("the production prebuild fails closed without printing supplied values", () => {
  const result = spawnSync(process.execPath, ["scripts/check-production.mjs"], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    env: { ...process.env, ...valid, NEXT_PUBLIC_SUPPORT_EMAIL: "private@example.com" },
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /NEXT_PUBLIC_SUPPORT_EMAIL/, result.error?.message);
  assert.doesNotMatch(result.stderr, /private@example\.com/);
});
