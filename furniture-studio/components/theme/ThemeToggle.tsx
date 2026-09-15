'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'theme'; // тот же ключ читает блокирующий скрипт в app/layout.tsx

export function ThemeToggle({ className = '' }: { className?: string }) {
  // На сервере атрибута ещё не видно, поэтому по умолчанию считаем тёмную —
  // она и есть тема по умолчанию для всех, кто ничего не выбирал.
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
  }, []);

  function toggle() {
    const next = !isLight;
    setIsLight(next);
    document.documentElement.setAttribute('data-theme', next ? 'light' : 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'light' : 'dark');
    } catch {
      // localStorage может быть недоступен (приватный режим и т.п.) — тема всё
      // равно переключится на текущей странице, просто не запомнится на будущее.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? 'Включить тёмную тему' : 'Включить светлую тему'}
      aria-pressed={isLight}
      title={isLight ? 'Тёмная тема' : 'Светлая тема'}
      className={`liquid-glass-icon-button liquid-glass-icon-button-sm ${className}`}
    >
      {isLight ? (
        // Луна — показываем, когда активна светлая тема (кнопка предлагает вернуть тёмную)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[18px] w-[18px]">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
        </svg>
      ) : (
        // Солнце — активна тёмная тема (кнопка предлагает включить светлую)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[18px] w-[18px]">
          <circle cx="12" cy="12" r="4.2" />
          <path strokeLinecap="round" d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
