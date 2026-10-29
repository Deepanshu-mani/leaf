const PRODUCTION_SITE_URL = "https://askleaf.vercel.app";

/** Canonical public origin, with safe preview and local-development fallbacks. */
export function getSiteUrl(requestUrl?: string) {
  const configuredUrl = process.env.APP_URL?.trim();
  if (configuredUrl) return new URL(configuredUrl);
  if (process.env.VERCEL_ENV === "production") return new URL(PRODUCTION_SITE_URL);
  if (process.env.VERCEL_URL) return new URL(`https://${process.env.VERCEL_URL}`);
  if (requestUrl) return new URL(new URL(requestUrl).origin);
  return new URL("http://localhost:3000");
}
