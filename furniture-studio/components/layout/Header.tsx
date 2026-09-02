import Link from 'next/link';
import Image from 'next/image';
import { getSiteSettings } from '@/lib/queries/site';
import { siteAssetUrl } from '@/lib/utils/image';
import { MobileNav } from './MobileNav';

const NAV_LINKS = [
  { href: '/works', label: 'Работы' },
  { href: '/about', label: 'О мастерской' },
  { href: '/contacts', label: 'Контакты' },
];

export async function Header() {
  const settings = await getSiteSettings();
  const companyName = settings?.company_name || 'Мастерская';

  return (
    <header className="sticky top-0 z-50 border-b border-stone/70 bg-canvas/95 backdrop-blur">
      <div className="container-studio flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-lg tracking-tight">
          {settings?.logo_path ? (
            <span className="relative h-9 w-24">
              <Image
                src={siteAssetUrl(settings.logo_path)}
                alt={companyName}
                fill
                sizes="96px"
                className="object-contain object-left"
              />
            </span>
          ) : (
            companyName
          )}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-[15px] text-espresso hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/contacts"
          className="hidden rounded bg-ink px-5 py-2.5 text-[15px] text-canvas hover:bg-espresso md:inline-flex"
        >
          Обсудить проект
        </Link>

        <MobileNav />
      </div>
    </header>
  );
}
