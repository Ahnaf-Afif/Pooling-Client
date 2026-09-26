const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/poll/"],
      disallow: ["/api/", "/account", "/admin/", "/create", "/moderation", "/my-polls", "/sign-in"],
    },
    sitemap: `${siteUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
