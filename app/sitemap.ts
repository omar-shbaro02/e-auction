import type { MetadataRoute } from "next";
import { featuredListings } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1
    },
    ...featuredListings.map((listing) => ({
      url: absoluteUrl(`/products/${listing.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.8
    }))
  ];
}
