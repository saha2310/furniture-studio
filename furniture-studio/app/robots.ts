import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Файл должен лежать прямо в app/ (не в группе (public)) — иначе Next.js
// не отдаёт /robots.txt и поисковики получают 404.
//
// Копия сайта на Vercel нужна только для резервных копий (cron), в поиске
// её быть не должно: Яндекс считал бы её дублем основного сайта на сервере.
// Vercel сам выставляет переменную VERCEL=1 при сборке.
const isVercelCopy = process.env.VERCEL === '1';

export default function robots(): MetadataRoute.Robots {
  if (isVercelCopy) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
