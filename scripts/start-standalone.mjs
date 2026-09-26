import { cp, access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Next's standalone output excludes static assets; include them for self-hosting
// and production browser tests. Vercel serves these assets through its own CDN.
const output = resolve(".next/standalone");
await access(resolve(output, "server.js"));
await cp(".next/static", resolve(output, ".next/static"), { recursive: true });
try {
  await access("public");
  await cp("public", resolve(output, "public"), { recursive: true });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await import(pathToFileURL(resolve(output, "server.js")).href);
