'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CategoryWithChildren } from '@/types/domain';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

// Окно выбора подвида — общее для плиток «Что мы создаём» на главной
// (components/home/CategoryTile.tsx) и для фильтра каталога на /works
// (components/works/CategoryFilter.tsx). Показывает «Все <категория>» и
// каждый подвид как ссылку; куда именно ведёт ссылка, решает вызывающий
// через hrefFor (например, фильтр каталога сам решает, что делать с
// выбранным цветом).
//
// Компонент монтируется только пока окно открыто — родитель рендерит его
// условно, поэтому блокировка скролла страницы (useBodyScrollLock) и
// подписка на Escape живут ровно столько, сколько открыт диалог.
// Рендерится через портал в body, чтобы position: fixed не зависел от
// transform/filter/overflow предков (у кнопок фильтра есть isolation и
// overflow: hidden).
export function SubcategoryDialog({
  category,
  onClose,
  hrefFor,
  activeSlug,
}: {
  category: CategoryWithChildren;
  onClose: () => void;
  hrefFor: (slug: string) => string;
  // Slug текущего выбора (родителя или одного из его подвидов) — подсвечивается в списке.
  activeSlug?: string;
}) {
  useBodyScrollLock();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const optionClass = (active: boolean) =>
    `flex items-center justify-between border px-5 py-4 text-sm text-ink transition hover:border-ink/40 hover:bg-surface ${
      active ? 'border-ink/50 bg-surface' : 'border-ink/15'
    }`;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Выбор подвида: ${category.name}`}>
      <div className="absolute inset-0 bg-[rgb(var(--photo-mist))]/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-md overflow-y-auto border border-ink/10 bg-canvas p-6 shadow-2xl animate-[preview-drawer-in_0.28s_ease-out] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">выбор подвида</p>
            <h3 className="mt-2 text-2xl tracking-[-0.02em] text-ink">{category.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-8 w-8 shrink-0 items-center justify-center text-ink/50 transition hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-2">
          <Link
            href={hrefFor(category.slug)}
            onClick={onClose}
            aria-current={activeSlug === category.slug ? 'true' : undefined}
            className={optionClass(activeSlug === category.slug)}
          >
            Все «{category.name.toLowerCase()}»
            <span aria-hidden="true">→</span>
          </Link>
          {category.children.map((child) => (
            <Link
              key={child.id}
              href={hrefFor(child.slug)}
              onClick={onClose}
              aria-current={activeSlug === child.slug ? 'true' : undefined}
              className={optionClass(activeSlug === child.slug)}
            >
              {child.name}
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
