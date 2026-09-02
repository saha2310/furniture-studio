'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/actions/auth';

const LINKS = [
  { href: '/admin', label: 'Обзор' },
  { href: '/admin/works', label: 'Работы' },
  { href: '/admin/categories', label: 'Категории' },
  { href: '/admin/home', label: 'Главная' },
  { href: '/admin/about', label: 'О мастерской' },
  { href: '/admin/contacts', label: 'Заявки' },
  { href: '/admin/settings', label: 'Настройки' },
];

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-[#151514]/95 backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/admin" className="font-display text-base text-white">Админка</Link>
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? 'Закрыть меню' : 'Открыть меню'} className="flex h-10 min-w-10 items-center justify-center border border-white/10 px-3 text-xs text-white/70">
          {open ? 'Закрыть' : 'Меню'}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 top-14 bg-[#151514]">
          <nav className="flex h-full flex-col overflow-y-auto px-5 pb-8 pt-5">
            {LINKS.map((link) => {
              const active = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
              return <Link key={link.href} href={link.href} className={`flex min-h-12 items-center border-b border-white/10 text-xl ${active ? 'text-white' : 'text-white/55'}`}>{link.label}</Link>;
            })}
            <div className="mt-auto pt-6">
              <Link href="/" target="_blank" className="flex min-h-12 items-center text-sm text-white/50">На сайт ↗</Link>
              <form action={logout}><button type="submit" className="flex min-h-12 items-center text-sm text-white/50">Выйти</button></form>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
