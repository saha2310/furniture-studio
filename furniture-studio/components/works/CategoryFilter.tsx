'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CategoryWithChildren } from '@/types/domain';
import { SubcategoryDialog } from './SubcategoryDialog';

// Ripple от точки клика — перенесено из code_artifact(2).html. В референсе
// это был <a href="#"> с preventDefault (SPA-имитация); здесь Link ведёт на
// реальный /works?category=..., поэтому preventDefault не вызываем — ripple
// просто проигрывает часть анимации, пока идёт переход, как обычный
// тактильный отклик на тап. Работает и для <button> (категории с подвидами).
function spawnFilterRipple(event: React.MouseEvent<HTMLElement>) {
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const diameter = Math.max(rect.width, rect.height);

  const ripple = document.createElement('span');
  ripple.className = 'filter-ripple';
  ripple.style.width = `${diameter}px`;
  ripple.style.height = `${diameter}px`;
  ripple.style.left = `${event.clientX - rect.left - diameter / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - diameter / 2}px`;

  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

const chipClass = (active: boolean) =>
  `liquid-glass-filter-button inline-flex h-12 items-center border px-7 rounded-full text-[11px] uppercase tracking-[0.12em] transition-colors ${
    active ? 'is-active' : ''
  }`;

export function CategoryFilter({
  categories,
  activeSlug,
  activeColorHex,
}: {
  // Только категории верхнего уровня, каждая со своими подкатегориями.
  // Подвиды отдельными кнопками в фильтр не выводятся — они выбираются в
  // окне, которое открывается по клику на категорию (SubcategoryDialog), —
  // так фильтр не разрастается по мере добавления подкатегорий.
  categories: CategoryWithChildren[];
  // Slug выбранной категории ИЛИ подвида (из ?category=...).
  activeSlug?: string;
  // Тот же цвет, что выбран в ColorFilter. Переносится в URL только когда
  // категория сбрасывается на «Все» (см. hrefFor ниже) — для конкретных
  // категорий цвет сбрасывается, чтобы не улететь в пустую выдачу.
  activeColorHex?: string;
}) {
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  // Цвета в фильтре ниже подгружены именно под ТЕКУЩУЮ категорию
  // (getAvailableColors(categorySlug) в page.tsx) — если слепо переносить
  // выбранный цвет на другую категорию, легко получить пустую выдачу без
  // единой подсказки почему (в этой категории такого цвета может просто не
  // быть). Поэтому переносим цвет только на кнопку «Все»: раз цвет уже был
  // доступен в какой-то категории, при сбросе категории он точно останётся
  // непустым. Для конкретных категорий и подвидов цвет сбрасывается — как и раньше.
  function hrefFor(categorySlug?: string) {
    const params = new URLSearchParams();
    if (categorySlug) params.set('category', categorySlug);
    if (!categorySlug && activeColorHex) params.set('color', activeColorHex);
    const query = params.toString();
    return query ? `/works?${query}` : '/works';
  }

  const openCategory = categories.find((c) => c.id === openCategoryId) ?? null;

  return (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по категории">
        <Link href={hrefFor()} onClick={spawnFilterRipple} className={chipClass(!activeSlug)}>
          Все
        </Link>
        {categories.map((category) => {
          const activeChild = category.children.find((child) => child.slug === activeSlug);
          const isActive = activeSlug === category.slug || !!activeChild;

          if (category.children.length === 0) {
            return (
              <Link key={category.id} href={hrefFor(category.slug)} onClick={spawnFilterRipple} className={chipClass(isActive)}>
                {category.name}
              </Link>
            );
          }

          // Есть подвиды — вместо прямого перехода открываем окно выбора:
          // «Все <категория>» или конкретный подвид. Если подвид уже выбран,
          // показываем его в подписи, чтобы было видно, что именно включено.
          return (
            <button
              key={category.id}
              type="button"
              aria-haspopup="dialog"
              onClick={(event) => {
                spawnFilterRipple(event);
                setOpenCategoryId(category.id);
              }}
              className={chipClass(isActive)}
            >
              <span className="inline-flex items-center gap-2">
                {activeChild ? `${category.name} · ${activeChild.name}` : category.name}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          );
        })}
      </div>

      {openCategory && (
        <SubcategoryDialog
          category={openCategory}
          activeSlug={activeSlug}
          hrefFor={hrefFor}
          onClose={() => setOpenCategoryId(null)}
        />
      )}
    </>
  );
}
