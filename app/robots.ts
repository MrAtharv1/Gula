import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gula.health";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/markers", "/markers/"],
        disallow: ["/api/", "/debug/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
