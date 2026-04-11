import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tickr.id";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/am-dashboard", "/am-dashboard/", "/api/"],
      },
    ],
    sitemap: `${siteUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
