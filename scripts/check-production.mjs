import { pathToFileURL } from "node:url";
import { isIP } from "node:net";

function placeholderHost(value) {
  const host = value.toLowerCase().replace(/\.$/, "");
  return host === "localhost" || isIP(host.replace(/^\[|\]$/g, "")) !== 0 ||
    /(^|\.)example\.(com|org|net|test)$/.test(host) ||
    /\.(test|invalid|local|localhost)$/.test(host);
}

function httpsOrigin(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (placeholderHost(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function productionConfigErrors(env) {
  if (env.VERCEL_ENV !== "production") return [];

  const errors = [];
  const supportEmail = env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "";
  const emailDomain = supportEmail.split("@")[1] || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail) ||
      placeholderHost(emailDomain)) {
    errors.push("NEXT_PUBLIC_SUPPORT_EMAIL must be a real, monitored mailbox");
  }

  const site = httpsOrigin(env.NEXT_PUBLIC_SITE_URL);
  const proxy = httpsOrigin(env.API_PROXY_TARGET);
  if (!site) errors.push("NEXT_PUBLIC_SITE_URL must be a public HTTPS origin");
  if (!proxy) errors.push("API_PROXY_TARGET must be a public HTTPS origin");
  if (site && proxy && site === proxy) errors.push("The frontend and backend origins must differ");
  if (env.NEXT_PUBLIC_API_URL !== "/api") errors.push("NEXT_PUBLIC_API_URL must be /api for first-party authentication cookies");
  if (proxy && env.API_INTERNAL_URL !== `${proxy}/api`) errors.push("API_INTERNAL_URL must match the backend /api origin");
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.VERCEL_ENV === "production") {
    const { default: nextEnv } = await import("@next/env");
    nextEnv.loadEnvConfig(process.cwd());
  }
  const errors = productionConfigErrors(process.env);
  if (errors.length) {
    console.error(`Production frontend configuration is invalid:\n- ${errors.join("\n- ")}`);
    process.exitCode = 1;
  }
}
