const STORAGE = "wdyt.pending-commands.v1";
// Stop before the server's 24-hour receipt expiry, allowing for clock skew.
const RETRY_WINDOW = 23 * 60 * 60 * 1000;
const inFlight = new Map();

function readPending() {
  try {
    const rows = JSON.parse(sessionStorage.getItem(STORAGE) || "[]");
    if (!Array.isArray(rows) || rows.length > 32 || rows.some((row) =>
      !/^[a-f0-9]{64}$/.test(row.scope) || !/^[a-f0-9-]{36}$/.test(row.key) || !Number.isFinite(row.createdAt))) throw new Error();
    return rows;
  } catch {
    throw new Error("Retry tracking is unavailable. Check My Polls or the moderation history before starting a new request in a new tab.");
  }
}

function savePending(rows) {
  try { sessionStorage.setItem(STORAGE, JSON.stringify(rows)); }
  catch { throw new Error("Browser session storage is needed for safe submissions. Enable it, then retry in this tab."); }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}

// Retain only an opaque request digest, random key and time in this tab. Never
// persist account IDs, poll text, notes, responses, cookies or authentication data.
// Failed/uncertain responses keep the same key; only confirmed success clears it.
export async function runCommand(actorId, path, options, send) {
  const input = JSON.stringify([actorId, path, options.method, canonical(options.body ? JSON.parse(options.body) : null)]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const scope = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (inFlight.has(scope)) return inFlight.get(scope);
  const pending = (async () => {
    const rows = readPending();
    let row = rows.find((item) => item.scope === scope);
    if (row && (Date.now() - row.createdAt >= RETRY_WINDOW || row.createdAt > Date.now())) {
      throw new Error("This pending request is too old to retry safely. Check My Polls or the moderation history before starting a new request in a new tab.");
    }
    if (!row) {
      if (rows.length >= 32) throw new Error("Too many unconfirmed requests in this tab. Check My Polls or the moderation history before starting new requests.");
      row = { scope, key: crypto.randomUUID(), createdAt: Date.now() };
      savePending([...rows, row]); // Must succeed before any write is sent.
    }
    const result = await send({ ...options, headers: {
      ...options.headers, "Idempotency-Key": row.key, "X-Command-Actor": actorId,
    } });
    savePending(readPending().filter((item) => item.key !== row.key));
    return result;
  })();
  inFlight.set(scope, pending);
  try { return await pending; }
  finally { inFlight.delete(scope); }
}
