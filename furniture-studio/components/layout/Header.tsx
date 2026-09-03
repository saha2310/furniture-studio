import Link from 'next/link';
import Image from 'next/image';
import { getSiteSettings, getMenuItems } from '@/lib/queries/site';
import { siteAssetUrl } from '@/lib/utils/image';
import { MobileNav } from './MobileNav';
import { DesktopNav } from './DesktopNav';
import { FavoriteHeaderButton } from '@/components/favorites/FavoriteHeaderButton';

export async function Header() {
  const [settings, menu] = await Promise.all([getSiteSettings(), getMenuItems()]);
  const companyName = settings?.company_name || 'УЮТ';
  const visibleMenu = menu.length ? menu : [
    { id: 'fallback-works', href: '/works', label: 'Работы' },
    { id: 'fallback-about', href: '/about', label: 'О мастерской' },
    { id: 'fallback-contacts', href: '/contacts', label: 'Контакты' },
  ];

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="container-studio flex h-[82px] items-center justify-between gap-8 border-b border-white/10">
        <Link href="/" className="group flex min-w-0 items-center gap-2 sm:gap-2.5">
          {settings?.logo_path ? (
            <span className="relative h-8 w-9 shrink-0 sm:h-9 sm:w-10">
              <Image
                src={siteAssetUrl(settings.logo_path)}
                alt={companyName || 'Логотип мастерской'}
                fill
                sizes="40px"
                className="object-contain object-left"
              />
            </span>
          ) : null}
          {settings?.company_name?.trim() ? (
            <span
              className={`${settings?.logo_path ? 'border-l border-white/15 pl-2.5 sm:pl-3' : ''} whitespace-nowrap text-[10px] uppercase tracking-[0.12em] text-white/80 sm:text-[11px] md:text-xs`}
            >
              {settings.company_name}
            </span>
          ) : !settings?.logo_path ? (
            <span className="font-display text-[23px] tracking-[-0.04em]">Мастерская мягкой мебели</span>
          ) : null}
        </Link>

        <DesktopNav links={visibleMenu} />

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          <FavoriteHeaderButton />
          <Link href="/contacts" className="reference-button hidden md:inline-flex">
            Обсудить проект
          </Link>
          <MobileNav links={visibleMenu} />
        </div>
      </div>
    </header>
  );
}
