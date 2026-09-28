import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { runCommand } from "../../src/lib/commands.js";
import { createPoll, addReportNote } from "../../src/lib/api.js";

const storageKey = "wdyt.pending-commands.v1";
const options = { method: "POST", body: JSON.stringify({ question: "Private test question", category: "Tech" }) };
let values;
beforeEach(() => {
  values = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
});

test("uncertain commands keep their key across a module reload without persisting content", async () => {
  let first;
  await assert.rejects(runCommand("owner", "/polls", options, async (prepared) => {
    first = prepared.headers;
    throw new Error("Lost response");
  }), /Lost response/);
  const stored = values.get(storageKey);
  assert.equal(stored.includes("Private test question"), false);
  assert.equal(stored.includes("owner"), false);
  assert.deepEqual(Object.keys(JSON.parse(stored)[0]).sort(), ["createdAt", "key", "scope"]);
  const { runCommand: reloaded } = await import(`../../src/lib/commands.js?reload=${Date.now()}`);
  await reloaded("owner", "/polls", options, async (prepared) => {
    assert.deepEqual(prepared.headers, first);
    return { poll: { id: "created" } };
  });
  assert.deepEqual(JSON.parse(values.get(storageKey)), []);
});

test("simultaneous identical submissions share a single in-flight command", async () => {
  let count = 0;
  const send = async () => { count += 1; await new Promise((resolve) => setTimeout(resolve, 20)); return "done"; };
  const results = await Promise.all(Array.from({ length: 5 }, () => runCommand("owner", "/polls", options, send)));
  assert.deepEqual(results, Array(5).fill("done"));
  assert.equal(count, 1);
});

test("changed accounts, routes, methods and bodies get separate keys while reordered data reuses one", async () => {
  const keys = [];
  const send = async ({ headers }) => { keys.push(headers["Idempotency-Key"]); throw new Error("uncertain"); };
  const calls = [
    ["owner", "/polls", options],
    ["owner", "/polls", { ...options, body: JSON.stringify({ category: "Tech", question: "Private test question" }) }],
    ["another-owner", "/polls", options],
    ["owner", "/another-path", options],
    ["owner", "/polls", { ...options, method: "PATCH" }],
    ["owner", "/polls", { ...options, body: JSON.stringify({ question: "Changed question" }) }],
  ];
  for (const args of calls) await assert.rejects(runCommand(...args, send), /uncertain/);
  assert.equal(keys[0], keys[1]);
  assert.equal(new Set(keys).size, 5);
});

test("confirmed success permits a genuinely new command with identical content", async () => {
  const keys = [];
  const send = async ({ headers }) => { keys.push(headers["Idempotency-Key"]); return "done"; };
  await runCommand("owner", "/polls", options, send);
  await runCommand("owner", "/polls", options, send);
  assert.notEqual(keys[0], keys[1]);
});

test("expired or future-dated pending commands fail closed rather than silently generating a new key", async () => {
  await assert.rejects(runCommand("owner", "/polls", options, async () => { throw new Error("uncertain"); }));
  const row = JSON.parse(values.get(storageKey))[0];
  for (const createdAt of [Date.now() - 24 * 60 * 60 * 1000, Date.now() + 10000]) {
    values.set(storageKey, JSON.stringify([{ ...row, createdAt }]));
    await assert.rejects(runCommand("owner", "/polls", options, () => assert.fail("must not submit")), /too old to retry safely/);
  }
});

test("unavailable, corrupt and full retry storage never permit untracked writes", async () => {
  sessionStorage.setItem = () => { throw new Error("storage denied"); };
  await assert.rejects(runCommand("owner", "/polls", options, () => assert.fail()), /session storage is needed/);
  values.set(storageKey, "not-json");
  await assert.rejects(runCommand("owner", "/polls", options, () => assert.fail()), /Retry tracking is unavailable/);
  values.set(storageKey, JSON.stringify(Array.from({ length: 32 }, (_, index) => ({
    scope: index.toString(16).padStart(64, "0"), key: crypto.randomUUID(), createdAt: Date.now(),
  }))));
  await assert.rejects(runCommand("owner", "/polls", options, () => assert.fail()), /Too many unconfirmed/);
});

test("API commands retain their key after invalid JSON, missing acknowledgements and invalid success shapes", async () => {
  const originalFetch = globalThis.fetch;
  const keys = [];
  let attempt = 0;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith("/auth/get-session")) return Response.json({ user: { id: "owner" } });
    keys.push(init.headers["Idempotency-Key"]);
    assert.equal(init.headers["X-Command-Actor"], "owner");
    attempt += 1;
    if (attempt === 1) return new Response("<html>proxy error</html>");
    if (attempt === 2) return Response.json({ poll: { id: "created" } });
    return Response.json(attempt === 3 ? {} : { poll: { id: "created" } }, { headers: { "Idempotency-Replayed": "true" } });
  };
  try {
    for (let i = 0; i < 3; i += 1) await assert.rejects(createPoll({ question: "Example question" }));
    assert.deepEqual(await createPoll({ question: "Example question" }), { poll: { id: "created" } });
    assert.equal(new Set(keys).size, 1);
    assert.deepEqual(JSON.parse(values.get(storageKey)), []);
  } finally { globalThis.fetch = originalFetch; }
});

test("moderation commands use the same retry protocol and reject signed-out submissions", async () => {
  const originalFetch = globalThis.fetch;
  let signedIn = false;
  let writes = 0;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith("/auth/get-session")) return Response.json(signedIn ? { user: { id: "staff" } } : null);
    writes += 1;
    assert.match(init.headers["Idempotency-Key"], /^[a-f0-9-]{36}$/);
    return Response.json({ action: { id: "audit-record" } }, { headers: { "Idempotency-Replayed": "false" } });
  };
  try {
    await assert.rejects(addReportNote("report", "Private staff note"), /Sign in/);
    assert.equal(writes, 0);
    signedIn = true;
    assert.deepEqual(await addReportNote("report", "Private staff note"), { action: { id: "audit-record" } });
    assert.equal(writes, 1);
  } finally { globalThis.fetch = originalFetch; }
});
