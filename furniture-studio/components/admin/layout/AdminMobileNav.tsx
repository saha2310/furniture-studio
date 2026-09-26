'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/actions/auth';

const LINKS = [
  { href: '/admin', label: 'Обзор' },
  { href: '/admin/works', label: 'Работы' },
  { href: '/admin/categories', label: 'Категории' },
];

// См. AdminSidebar.tsx — та же логика: редко нужные разделы спрятаны под
// свёрнутую по умолчанию секцию с предупреждением.
const ADVANCED_LINKS = [
  { href: '/admin/home', label: 'Главная' },
  { href: '/admin/about', label: 'О мастерской' },
  { href: '/admin/media', label: 'Медиатека' },
  { href: '/admin/settings', label: 'Настройки' },
];

function AdvancedSection({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const containsActive = ADVANCED_LINKS.some((link) => pathname.startsWith(link.href));
  const [open, setOpen] = useState(containsActive);

  return (
    <div className="border-b border-ink/10 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between gap-2 py-2 text-left text-[18px] text-ink/55"
      >
        <span>Управление сайтом <span aria-hidden="true">⚠️</span></span>
        <span className={`text-sm text-ink/35 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">▾</span>
      </button>

      {open && (
        <>
          <p className="px-0.5 pb-2 text-sm leading-5 text-ink/40">
            Эти возможности для продвинутых пользователей! Скорее всего для ваших задач не понадобится.
          </p>
          {ADVANCED_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={`flex min-h-14 items-center border-t border-ink/10 py-2 text-[18px] transition-colors active:bg-ink/[0.04] ${active ? 'text-ink' : 'text-ink/55'}`}
              >
                <span className="min-w-0 truncate">{link.label}</span>
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
}

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      {/*
        Раньше эта панель была "sticky top-0" — в связке с другими блоками
        страницы, которые скроллятся горизонтально внутри себя (например,
        VariantBar с цветовыми вариантами на странице редактирования
        работы), это на мобильных WebKit-браузерах (iOS Safari) ломало
        sticky: панель переставала прилипать к верху экрана и "уезжала"
        вместе с контентом при скролле — то есть вела себя как в обычной
        десктопной раскладке без фиксированного мобильного меню. "fixed"
        не зависит от скролла родителей и не подвержен этому багу — меню
        всегда остаётся у верхнего края экрана. Так как fixed выпадает из
        потока документа, ниже добавлен spacer той же высоты (h-14),
        чтобы контент страницы не оказывался под панелью.
      */}
      <div className="fixed inset-x-0 top-0 z-[10000] border-b border-ink/10 bg-canvas/95 backdrop-blur md:hidden">
        <div className="relative z-[10001] flex h-14 items-center justify-between px-4">
          <Link href="/admin" onClick={() => setOpen(false)} className="text-[10px] font-medium uppercase tracking-[0.16em] text-ink">Furniture Studio</Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="admin-mobile-menu"
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            className="flex min-h-10 min-w-[84px] items-center justify-center border border-ink/15 px-4 text-[11px] uppercase tracking-[0.12em] text-ink/80 transition-colors active:bg-ink/10 active:text-ink"
          >
            {open ? 'Закрыть' : 'Меню'}
          </button>
        </div>
      </div>
      {/* Компенсация высоты панели (h-14), теперь выпавшей из потока. */}
      <div className="h-14 md:hidden" aria-hidden="true" />

      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-canvas"
          onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
        >
          <nav
            id="admin-mobile-menu"
            aria-label="Меню администратора"
            className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(3.5rem+0.5rem)]"
          >
            {LINKS.map((link) => {
              const active = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-14 items-center border-b border-ink/10 py-2 text-[18px] transition-colors active:bg-ink/[0.04] ${active ? 'text-ink' : 'text-ink/55'}`}
                >
                  <span className="min-w-0 truncate">{link.label}</span>
                </Link>
              );
            })}

            <AdvancedSection pathname={pathname} onNavigate={() => setOpen(false)} />

            <div className="mt-auto border-t border-ink/10 pt-5">
              <Link href="/" target="_blank" onClick={() => setOpen(false)} className="flex min-h-12 items-center text-sm text-ink/60">На сайт ↗</Link>
              <form action={logout}>
                <button type="submit" className="flex min-h-12 items-center text-sm text-ink/60">Выйти</button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

