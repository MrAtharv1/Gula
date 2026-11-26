import type { MetadataRoute } from "next";
import { METRIC_DICTIONARY } from "@/lib/db/metricDictionary";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gula.health";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const markerEntries: MetadataRoute.Sitemap = Object.keys(METRIC_DICTIONARY).map(
    (key) => ({
      url: `${BASE_URL}/markers/${key}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    })
  );

  return [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/markers`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...markerEntries,
  ];
}
