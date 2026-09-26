const apiUrl = (process.env.API_INTERNAL_URL || "http://localhost:5000/api").replace(/\/$/, "");
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap() {
  const urls = [{ url: siteUrl, lastModified: new Date() }];

  try {
    for (let page = 1; page <= 100; page += 1) {
      const response = await fetch(`${apiUrl}/polls?page=${page}&limit=100`, {
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
      if (!data.hasMore) break;
    }
  } catch {
    // Keep the homepage in the sitemap if the API is temporarily unavailable during a build.
  }

  return urls;
}
