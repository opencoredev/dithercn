import type { MetadataRoute } from "next";

import { SITE } from "@/constants/site";
import { source } from "@/lib/source";
import { TRUST_PAGES, TRUST_PAGE_SLUGS } from "@/lib/trust-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      changeFrequency: "monthly",
      lastModified: new Date(),
      priority: 1,
      url: SITE.URL,
    },
    ...TRUST_PAGE_SLUGS.map((slug) => ({
      changeFrequency: "yearly" as const,
      lastModified: new Date(TRUST_PAGES[slug].updated),
      priority: 0.4,
      url: `${SITE.URL}/${slug}`,
    })),
  ];

  const docPages: MetadataRoute.Sitemap = source.getPages().map((page) => ({
    changeFrequency: "weekly" as const,
    lastModified: new Date(),
    priority: page.url === "/docs" ? 0.9 : 0.8,
    url: `${SITE.URL}${page.url}`,
  }));

  return [...staticPages, ...docPages];
}
