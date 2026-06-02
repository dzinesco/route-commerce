import { MetadataRoute } from "next";
import { getActiveStopsForSitemap } from "@/actions/stops";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://yourdomain.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Fetch active stops for dynamic URLs
  const activeStops = await getActiveStopsForSitemap();

  // Base static URLs
  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/privacy-policy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms-and-conditions`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },

    // Tuxedo Corn storefront
    {
      url: `${BASE_URL}/tuxedo`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/tuxedo/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/tuxedo/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/tuxedo/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },

    // Indian River Direct storefront
    {
      url: `${BASE_URL}/indian-river-direct`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/indian-river-direct/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/indian-river-direct/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/indian-river-direct/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },

    // Wholesale portal
    {
      url: `${BASE_URL}/wholesale/portal`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Dynamic stop URLs
  const stopUrls: MetadataRoute.Sitemap = activeStops.map((stop) => ({
    url: `${BASE_URL}/${stop.brand_slug}/stops/${stop.slug}`,
    lastModified: new Date(stop.last_modified),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticUrls, ...stopUrls];
}
