/**
 * The site's public origin, for the sitemap, robots.txt and canonical links.
 * Set NEXT_PUBLIC_SITE_URL once a custom domain is connected; until then the
 * Vercel address is what search engines should index.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://sunkadakatte-mahaganapathi.vercel.app"
).replace(/\/$/, "");
