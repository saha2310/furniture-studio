'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFavorites } from '@/components/favorites/FavoritesProvider';
import { NavigationIcon, type NavigationIconName } from '@/components/icons/NavigationIcons';

const ITEMS: Array<{ href: string; label: string; icon: NavigationIconName }> = [
  { href: '/', label: 'Главная', icon: 'home' },
  { href: '/works', label: 'Работы', icon: 'works' },
  { href: '/favorites', label: 'Избранное', icon: 'favorites' },
  { href: '/contacts', label: 'Связаться', icon: 'contact' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { count } = useFavorites();

  return (
    <nav className="mobile-bottom-nav" aria-label="Основная навигация">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`mobile-bottom-nav-item ${active ? 'is-active' : ''}`}
          >
            <span className="mobile-bottom-nav-icon-wrap">
              <NavigationIcon name={item.icon} active={active && item.icon === 'favorites'} className="h-5 w-5" />
              {item.icon === 'favorites' && count > 0 ? <span className="mobile-bottom-nav-count" aria-label={`${count} избранных работ`}>{count > 99 ? '99+' : count}</span> : null}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
