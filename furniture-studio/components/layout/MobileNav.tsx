'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function MobileNav({ links }: { links: { id: string; href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
        onClick={() => setOpen((v) => !v)}
        className="relative z-[70] flex h-10 w-10 items-center justify-center"
      >
        <span className="relative block h-4 w-6">
          <span className={`absolute left-0 top-0 h-px w-6 bg-white transition-transform duration-300 ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
          <span className={`absolute left-0 top-[7px] h-px w-6 bg-white transition-opacity duration-300 ${open ? 'opacity-0' : ''}`} />
          <span className={`absolute left-0 top-[14px] h-px w-6 bg-white transition-transform duration-300 ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
        </span>
      </button>

      <div
        id="mobile-nav-panel"
        className={`fixed inset-0 z-[60] bg-[#151514] transition-[opacity,visibility] duration-300 ${open ? 'visible opacity-100' : 'invisible opacity-0'}`}
        aria-hidden={!open}
      >
        <nav className="flex h-full flex-col justify-center px-6 pb-20 pt-24 sm:px-10">
          {links.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="group flex items-center justify-between border-b border-white/10 py-5 text-[clamp(2rem,8vw,4rem)] font-light tracking-[-0.035em]"
            >
              <span>{link.label}</span>
              <span className="text-lg text-stone transition-transform duration-300 group-hover:translate-x-2">0{i + 1}</span>
            </Link>
          ))}
          <Link href="/contacts" onClick={() => setOpen(false)} className="reference-button mt-10 self-start">
            Обсудить проект <span aria-hidden>→</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
