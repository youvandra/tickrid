import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tickr.id";
  const siteUrl = base.replace(/\/$/, "");
  const now = new Date();

  const routes = [
    "/",
    "/buy",
    "/display-options",
    "/instructions",
    "/supported-tickers",
    "/faqs",
    "/contact",
    "/setup",
  ];

  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/buy" ? 0.9 : 0.7,
  }));
}
