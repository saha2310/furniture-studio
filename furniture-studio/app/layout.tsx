import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import './globals.css';
import { getSiteSettings } from '@/lib/queries/site';
import { siteAssetUrl } from '@/lib/utils/image';

const fraunces = Fraunces({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: settings?.seo_default_title || 'Мастерская мягкой мебели — диваны на заказ',
      template: '%s — мастерская мягкой мебели',
    },
    description:
      settings?.seo_default_description ||
      'Диваны и кресла на заказ. Индивидуальное изготовление мягкой мебели под пространство клиента.',
    icons: settings?.favicon_path ? { icon: siteAssetUrl(settings.favicon_path) } : undefined,
    openGraph: settings?.og_image_path ? { images: [{ url: siteAssetUrl(settings.og_image_path) }] } : undefined,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
