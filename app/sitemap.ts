import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteUrl";

/** Public pages only. /admin and /api are kept out (see robots.ts). */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/sevas", priority: 0.9, changeFrequency: "weekly" },
    { path: "/calendar", priority: 0.8, changeFrequency: "weekly" },
    { path: "/donate", priority: 0.7, changeFrequency: "monthly" },
    { path: "/about", priority: 0.7, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
    { path: "/announcements", priority: 0.6, changeFrequency: "weekly" },
    { path: "/gallery", priority: 0.6, changeFrequency: "monthly" },
    { path: "/track-booking", priority: 0.4, changeFrequency: "yearly" },
    { path: "/privacy-policy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
    { path: "/refund-policy", priority: 0.2, changeFrequency: "yearly" },
  ];
  return pages.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
