# What Do You Think? Client

Next.js frontend for the Bangladesh polling platform.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Browser API calls use `/api` and Next.js proxies them to the Express server at `API_PROXY_TARGET`, keeping Better Auth cookies first-party.

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

Better Auth sessions power account ownership. Anyone may browse, vote, view results, share, and report without signing in. Verified accounts can create polls, and My Polls follows the owner across devices. Owners can edit before the first vote, then close, archive, or soft-delete their polls. Moderator and administrator accounts receive a protected report queue.
