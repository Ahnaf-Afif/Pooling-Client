# What Do You Think? Client

Next.js frontend for the Bangladesh polling platform.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Use the local API at `http://localhost:5000/api` and open `http://localhost:3000`.

## Vercel production

This repository's `.env.production` contains only public values:

```text
NEXT_PUBLIC_API_URL=https://pooling-server.vercel.app/api
NEXT_PUBLIC_SITE_URL=https://pooling-client.vercel.app
```

If either variable is also set in the Vercel project settings, set it to the same value. Project settings override the file during a build. Redeploy after changing these build-time values. Never add the MongoDB connection string to this frontend project.
