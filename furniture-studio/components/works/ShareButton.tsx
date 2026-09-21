'use client';

import { useEffect, useRef, useState } from 'react';
import { SocialIcon } from '@/components/layout/SocialIcon';

type SharePlatform = 'telegram' | 'whatsapp' | 'vk';

const MENU_ITEMS: Array<{ platform: SharePlatform; label: string; buildHref: (url: string, text: string) => string }> = [
  {
    platform: 'telegram',
    label: 'Telegram',
    buildHref: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    platform: 'whatsapp',
    label: 'WhatsApp',
    buildHref: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    platform: 'vk',
    label: 'ВКонтакте',
    buildHref: (url, text) => `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
  },
];

// Нативный Web Share API предпочитаем только там, где он реально даёт нативный
// системный лист (мобильные тачскрин-устройства) — на десктопе (даже если API
// присутствует в браузере) удобнее свой компактный список сетей, т.к. системный
// шаринг там обычно менее привычен пользователю сайта.
function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 767px)').matches;
}

export function ShareButton({
  title,
  size = 'md',
  className = '',
}: {
  title: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleTriggerClick() {
    if (typeof navigator !== 'undefined' && 'share' in navigator && isMobileViewport()) {
      try {
        await navigator.share({ title, url: window.location.href });
      } catch {
        // Пользователь закрыл системный лист — это не ошибка, ничего не делаем.
      }
      return;
    }
    setOpen((value) => !value);
  }

  async function handleCopyLink() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('textarea');
      input.value = url;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Поделиться"
        title="Поделиться"
        onClick={handleTriggerClick}
        className={`liquid-glass-icon-button ${size === 'sm' ? 'liquid-glass-icon-button-sm' : ''}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={size === 'sm' ? 'h-[18px] w-[18px]' : 'h-5 w-5'}
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="2.6" />
          <circle cx="6" cy="12" r="2.6" />
          <circle cx="18" cy="19" r="2.6" />
          <path d="M8.3 10.7 15.7 6.3M8.3 13.3l7.4 4.4" />
        </svg>
      </button>

      {open && (
        <div role="menu" aria-label="Поделиться" className="create-card absolute right-0 top-[calc(100%+10px)] z-30 w-56 border border-ink/12 bg-surface p-1.5">
          {MENU_ITEMS.map((item) => (
            <a
              key={item.platform}
              role="menuitem"
              href={item.buildHref(currentUrl, title)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-ink/85 transition-colors hover:bg-ink/[0.06] hover:text-ink"
            >
              <SocialIcon platform={item.platform} className="h-[18px] w-[18px] shrink-0 text-stone" />
              {item.label}
            </a>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={handleCopyLink}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-ink/85 transition-colors hover:bg-ink/[0.06] hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0 text-stone" aria-hidden="true">
              <rect x="9" y="9" width="11" height="11" rx="1.5" />
              <path d="M5 15V6.5A1.5 1.5 0 0 1 6.5 5H15" />
            </svg>
            {copied ? 'Ссылка скопирована' : 'Скопировать ссылку'}
          </button>
        </div>
      )}
    </div>
  );
}
