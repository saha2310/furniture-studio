'use client';

import { useState } from 'react';
import Link from 'next/link';

const LINKS = [
  { href: '/works', label: 'Работы' },
  { href: '/about', label: 'О мастерской' },
  { href: '/contacts', label: 'Контакты' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center"
      >
        <span className="relative block h-4 w-6">
          <span
            className={`absolute left-0 top-0 h-[1.5px] w-6 bg-ink transition-transform ${open ? 'translate-y-[7px] rotate-45' : ''}`}
          />
          <span className={`absolute left-0 top-[7px] h-[1.5px] w-6 bg-ink transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span
            className={`absolute left-0 top-[14px] h-[1.5px] w-6 bg-ink transition-transform ${open ? '-translate-y-[7px] -rotate-45' : ''}`}
          />
        </span>
      </button>

      {open && (
        <div id="mobile-nav-panel" className="fixed inset-x-0 top-[64px] z-40 border-t border-stone bg-canvas">
          <nav className="container-studio flex flex-col py-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-stone/60 py-4 text-lg"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
