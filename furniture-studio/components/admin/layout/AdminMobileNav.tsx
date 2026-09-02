'use client';

import Link from 'next/link';
import { useState } from 'react';
import { logout } from '@/lib/actions/auth';

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/works', label: 'Работы' },
  { href: '/admin/categories', label: 'Категории' },
  { href: '/admin/home', label: 'Главная' },
  { href: '/admin/about', label: 'О компании' },
  { href: '/admin/contacts', label: 'Заявки' },
  { href: '/admin/settings', label: 'Настройки' },
];

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-stone/70 bg-canvas md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <span className="font-display">Админка</span>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="text-sm">
          {open ? 'Закрыть' : 'Меню'}
        </button>
      </div>
      {open && (
        <nav className="flex flex-col border-t border-stone/70 px-4 py-2">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="py-3 text-[15px]">
              {link.label}
            </Link>
          ))}
          <form action={logout} className="border-t border-stone/60 py-2">
            <button type="submit" className="py-2 text-sm text-stone">
              Выйти
            </button>
          </form>
        </nav>
      )}
    </div>
  );
}
