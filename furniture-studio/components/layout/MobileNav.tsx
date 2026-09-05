'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function MobileNav({ links }: { links: { id: string; href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <div className="mobile-header-actions md:hidden">
        <ThemeToggle className="mobile-header-theme-toggle" />
        <button
          type="button"
            aria-expanded={open}
          aria-controls="mobile-nav-panel"
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          onClick={() => setOpen((v) => !v)}
          className="mobile-menu-toggle liquid-glass-icon-button liquid-glass-icon-button-sm relative z-[10000] flex items-center justify-center md:hidden"
        >
          <span className="relative block h-4 w-6">
            <span className={`mobile-menu-toggle-line absolute left-0 top-0 h-px w-6 transition-transform duration-300 ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
            <span className={`mobile-menu-toggle-line absolute left-0 top-[7px] h-px w-6 transition-opacity duration-300 ${open ? 'opacity-0' : ''}`} />
            <span className={`mobile-menu-toggle-line absolute left-0 top-[14px] h-px w-6 transition-transform duration-300 ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
          </span>
        </button>
      </div>

      <div
        id="mobile-nav-panel"
        onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        className={`fixed inset-0 z-[9998] md:hidden bg-canvas transition-[opacity,visibility] duration-300 ${open ? 'visible opacity-100' : 'invisible opacity-0'}`}
        aria-hidden={!open}
      >
        <nav className="flex h-full flex-col justify-center px-6 pb-20 pt-24 sm:px-10">
          {[...links, { id: 'favorites-mobile', href: '/favorites', label: 'Избранные' }].map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="mobile-nav-invert group flex items-center justify-between border-b border-ink/10 py-5 text-[clamp(2rem,8vw,4rem)] font-light tracking-[-0.035em]"
            >
              <span>{link.label}</span>
              <span className="text-lg text-stone transition-transform duration-300 group-hover:translate-x-2">0{i + 1}</span>
            </Link>
          ))}
          <div className="mt-10 flex items-center gap-3">
            <Link href="/contacts" onClick={() => setOpen(false)} className="reference-button self-start">
              Обсудить проект
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
