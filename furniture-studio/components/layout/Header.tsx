import Link from 'next/link';
import Image from 'next/image';
import { getSiteSettings, getMenuItems } from '@/lib/queries/site';
import { siteAssetUrl } from '@/lib/utils/image';
import { MobileNav } from './MobileNav';
import { DesktopNav } from './DesktopNav';

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
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          {settings?.logo_path ? (
            <span className="relative h-8 w-20 shrink-0 sm:h-9 sm:w-24">
              <Image
                src={siteAssetUrl(settings.logo_path)}
                alt={companyName}
                fill
                sizes="96px"
                className="object-contain object-left brightness-0 invert"
              />
            </span>
          ) : (
            <span className="font-display text-[23px] tracking-[-0.04em]">{companyName}</span>
          )}
          <span className="hidden border-l border-white/15 pl-3 text-[10px] text-stone sm:block">мастерская мягкой мебели</span>
        </Link>

        <DesktopNav links={visibleMenu} />

        <div className="ml-auto flex items-center gap-4">
          <Link href="/contacts" className="reference-button hidden md:inline-flex">
            Обсудить проект <span aria-hidden>→</span>
          </Link>
          <MobileNav links={visibleMenu} />
        </div>
      </div>
    </header>
  );
}
