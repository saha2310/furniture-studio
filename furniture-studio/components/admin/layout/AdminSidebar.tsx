'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/actions/auth';

const GROUPS = [
  { title: 'Работа с сайтом', links: [
    { href: '/admin', label: 'Обзор' },
    { href: '/admin/works', label: 'Работы' },
    { href: '/admin/categories', label: 'Категории' },
  ]},
  { title: 'Контент', links: [
    { href: '/admin/home', label: 'Главная' },
    { href: '/admin/about', label: 'О мастерской' },
  ]},
  { title: 'Клиенты', links: [
    { href: '/admin/contacts', label: 'Заявки' },
  ]},
  { title: 'Система', links: [
    { href: '/admin/settings', label: 'Настройки' },
  ]},
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col border-r border-white/10 bg-[#151514] px-4 py-5">
      <div className="flex items-center justify-between px-2">
        <Link href="/admin" className="font-display text-lg tracking-[-0.02em] text-white">Админка</Link>
        <span className="h-2 w-2 rounded-full border border-white/30" aria-hidden="true" />
      </div>

      <nav className="mt-7 flex-1 overflow-y-auto pr-1">
        {GROUPS.map((group) => (
          <div key={group.title} className="mb-7">
            <p className="px-2 text-[9px] uppercase tracking-[0.18em] text-white/35">{group.title}</p>
            <div className="mt-2 space-y-1">
              {group.links.map((link) => {
                const active = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative flex min-h-10 items-center border px-3 text-sm transition-colors ${
                      active ? 'border-white/10 bg-white/[0.04] text-white' : 'border-transparent text-white/55 hover:border-white/10 hover:bg-white/[0.02] hover:text-white'
                    }`}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-px bg-white" aria-hidden="true" />}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 pt-4">
        <Link href="/" target="_blank" className="flex min-h-10 items-center px-3 text-sm text-white/45 hover:bg-white/[0.02] hover:text-white">На сайт ↗</Link>
        <form action={logout}>
          <button type="submit" className="flex min-h-10 w-full items-center px-3 text-left text-sm text-white/45 hover:bg-white/[0.02] hover:text-white">Выйти</button>
        </form>
      </div>
    </aside>
  );
}
