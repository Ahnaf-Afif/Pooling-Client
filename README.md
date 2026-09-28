# What Do You Think? Client

Next.js frontend for the Bangladesh polling platform.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Browser API calls use `/api` and Next.js proxies them to the Express server at `API_PROXY_TARGET`, keeping Better Auth cookies first-party.

Use Node 22. To check a self-hosted production bundle:

```bash
npm run build
PORT=3000 HOSTNAME=127.0.0.1 npm run start:standalone
```

The standalone launcher copies the build's static/public assets into its output
directory before starting Next's generated server. `npm run test:e2e` uses this
same launcher on port 3100; install Playwright Chromium first. Browser tests use
intercepted local fixtures and a read-only SSR fixture on 127.0.0.1:5199, not
production data. Backend auth and transactions are separately tested against a
temporary replica set. Build test bundles with the isolated API target:

```bash
NEXT_PUBLIC_API_URL=/api API_INTERNAL_URL=http://127.0.0.1:5199/api API_PROXY_TARGET=http://127.0.0.1:5199 npm run build
npm run test:e2e
```

Do not deploy that test bundle; rebuild with the real production settings for a
release. No test fixture writes to a database or creates public posts.

Public and My Polls lists require the matching cursor-enabled API release.
Load-more follows `nextCursor`; changing category starts a new list. Missing or
stale statistics are labeled explicitly instead of showing invented zero counts.
Do not promote this frontend against the old numbered-page API.

Staff report/user lists now also use cursor navigation without a fixed page cap.
Report, poll and account action histories load on demand and offer Previous/Next
navigation through all retained records. Administrators can open the complete
retained audit log from User management. Histories include before/after snapshots
and remain private. Failed page loads can be retried without losing the cursor;
changing a queue/search resets it. Promote with the matching backend and verify
index migration `2026-09-command-retries-v7` first. The old embedded `history`,
numbered `pages`, and exact `total` response fields are no longer used by staff
lists. Audit storage immutability and retention policy are separate concerns.

Poll and result pages obtain personal voting state from the private `my-vote`
endpoint for the current account/guest, not browser-wide localStorage markers.
Old `voted:` markers are removed when these pages load; server receipts are not
deleted. Selected answers are no longer written to URLs or localStorage. A failed
lookup disables voting until retry succeeds, while aggregate results stay public.
The backend must support `my-vote` and same-choice retry responses before this
frontend is promoted. Guest/account identity reconciliation is still pending.

## Safe command retries

Poll creation and custom moderation writes use account-scoped command keys.
Unconfirmed requests retain their key through reloads in the same browser tab;
re-enter identical data to retry. Confirmed success clears the key so a later
intentional action is new. No automatic write retry occurs. Session storage
contains only request digests, random keys and timestamps, never form content,
notes, account IDs, session tokens or responses. Storage is bounded to 32 pending
commands. Do not clear it after an uncertain response: first check My Polls or
the moderation history. Changed data, another tab/device or cleared storage is
a new intent and can create another action.

Browser retries stop at 23 hours (server receipts expire at 24 hours), or if
storage is unavailable/corrupt/full. Check the existing outcome before starting
again in a new tab. Current authentication and staff verification still apply.
The UI requires a valid response and the backend replay acknowledgement; an old
backend is incompatible. Deploy the matching server and verify migration v7.
Owner changes and reports are not covered by this command protocol; votes and
recovery approvals have separate retry handling.

Owner and staff poll editors include the poll's `contentRevision` with each
edit. If another editor changed the content first, the server rejects the stale
draft without overwriting it; the form stays visible. The editor can discard the
draft and load the latest poll only after explicit confirmation. Copy any text
worth keeping before reloading. This requires a matching backend release:
older clients omit `expectedRevision` and receive HTTP 400 from the new API.

`npm test` runs isolated command tests; browser checks cover response loss,
reloads, malformed success responses, account changes and moderation notes.
These fixtures supplement, not replace, backend replica-set and real-provider
release verification.

## Vercel production

This repository's `.env.production` contains only public values:

```text
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SITE_URL=https://pooling-client.vercel.app
API_PROXY_TARGET=https://pooling-server.vercel.app
API_INTERNAL_URL=https://pooling-server.vercel.app/api
```

The production configuration now uses `NEXT_PUBLIC_API_URL=/api`, `API_PROXY_TARGET=https://pooling-server.vercel.app`, and `API_INTERNAL_URL=https://pooling-server.vercel.app/api`. Keep `/api` as the browser-facing value; calling the separate backend domain directly can cause Safari to block authentication cookies.

If any variable is also set in the Vercel project settings, set it to the same value. Project settings override the file during a build. Redeploy after changing these build-time values. Never add the MongoDB connection string to this frontend project.

Poll links expose their question and a generated card image through Open Graph and Twitter metadata. Messaging apps decide whether and when to show or refresh that preview; the share dialog also shows the card before sending the poll URL. Keep `NEXT_PUBLIC_SITE_URL` set to the public HTTPS frontend origin so preview image links point to the right deployment.

Better Auth sessions power account ownership. Anyone may browse, vote, view results, share, and report without signing in. Verified accounts can create polls, and My Polls follows the owner across devices. Owners can edit before the first vote, then close, archive, or soft-delete their polls. Moderators receive a protected report queue with private notes, action history, edit/remove resolution workflows, and a direct editor for any poll link or slug. Administrators also receive searchable user management for persistent roles, suspension, and reactivation.
