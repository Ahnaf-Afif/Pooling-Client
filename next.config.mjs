/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    const isDevelopment = process.env.NODE_ENV !== "production";
    const scriptSources = ["'self'", "'unsafe-inline'"];
    if (isDevelopment) scriptSources.push("'unsafe-eval'");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: [
            "default-src 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
            "img-src 'self' data: https://*.googleusercontent.com",
            "font-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            `script-src ${scriptSources.join(" ")}`,
            "connect-src 'self'",
          ].join("; ") },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
  async rewrites() {
    const target = (process.env.API_PROXY_TARGET || "http://localhost:5000").replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${target}/api/:path*` }];
  },
};

export default nextConfig;
