import { createServer } from "node:http";
import { poll } from "./poll.mjs";

// Read-only SSR fixture. No database, credentials, writes or public deployment.
const server = createServer((request, response) => {
  const path = new URL(request.url, "http://127.0.0.1:5199").pathname;
  const body = path === "/api/health" ? { status: "test-only" }
    : path === "/api/polls/browser-vote" ? { poll } : null;
  response.writeHead(request.method !== "GET" ? 405 : body ? 200 : 503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(body || { message: "No SSR fixture for this path" }));
});
server.listen(5199, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
