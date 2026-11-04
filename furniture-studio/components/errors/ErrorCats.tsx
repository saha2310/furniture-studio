'use client';

import { useEffect, useRef, useState } from 'react';
import { ERROR_CATS } from './catMarkup';

const STORAGE_KEY = 'error-cat';

/**
 * Карточки котов на странице ошибки с переключателем.
 * Выбор запоминается в браузере (localStorage), фон страницы
 * плавно подстраивается под выбранную карточку.
 */
export function ErrorCats({ className = '' }: { className?: string }) {
  const [active, setActive] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const index = ERROR_CATS.findIndex((cat) => cat.key === saved);
      if (index > 0) setActive(index);
    } catch {
      /* localStorage может быть недоступен — просто показываем первого кота */
    }
  }, []);

  useEffect(() => {
    const scene = frameRef.current?.closest<HTMLElement>('.error-scene');
    if (scene) scene.style.backgroundColor = ERROR_CATS[active].pageBg;
  }, [active]);

  const choose = (index: number) => {
    setActive(index);
    try {
      localStorage.setItem(STORAGE_KEY, ERROR_CATS[index].key);
    } catch {
      /* без сохранения выбора */
    }
  };

  return (
    <div className={`flex w-full flex-col items-center ${className}`}>
      <div ref={frameRef} className="error-cat-frame">
        {ERROR_CATS.map((cat, index) => (
          <div
            key={cat.key}
            className={cat.rootClass}
            role="img"
            aria-label={cat.alt}
            aria-hidden={index === active ? undefined : 'true'}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: cat.markup }}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Выбрать кота">
        {ERROR_CATS.map((cat, index) => (
          <button
            key={cat.key}
            type="button"
            className="error-cat-tab"
            aria-pressed={index === active}
            onClick={() => choose(index)}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
