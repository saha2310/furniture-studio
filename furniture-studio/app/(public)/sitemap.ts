// Файл лежит вне (public) route group namespace для Next.js — sitemap.ts должен
// находиться в app/, но мы держим его рядом с публичными страницами для читаемости;
// Next.js корректно резолвит app/(public)/sitemap.ts в /sitemap.xml, т.к. route group
// не участвует в URL.
import type { MetadataRoute } from 'next';
import { getAllWorkSlugs } from '@/lib/queries/works';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllWorkSlugs();

  const staticRoutes: MetadataRoute.Sitemap = ['', '/works', '/about', '/contacts'].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
  }));

  const workRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${siteUrl}/works/${slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...workRoutes];
}
