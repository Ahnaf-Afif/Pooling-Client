const apiUrl = (process.env.API_INTERNAL_URL || "http://localhost:5000/api").replace(/\/$/, "");
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap() {
  const urls = [{ url: siteUrl, lastModified: new Date() }];

  try {
    let cursor;
    for (let page = 1; page <= 100; page += 1) {
      const params = new URLSearchParams({ limit: "100", stats: "false" });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`${apiUrl}/polls?${params}`, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) break;
      const data = await response.json();
      for (const poll of data.polls || []) {
        urls.push({
          url: `${siteUrl}/poll/${encodeURIComponent(poll.id)}`,
          lastModified: poll.updatedAt || poll.createdAt || new Date(),
        });
      }
      cursor = data.nextCursor;
      if (!cursor) break;
    }
  } catch {
    // Keep the homepage in the sitemap if the API is temporarily unavailable during a build.
  }

  return urls;
}
