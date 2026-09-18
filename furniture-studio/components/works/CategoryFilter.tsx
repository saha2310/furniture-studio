'use client';

import Link from 'next/link';
import type { Category } from '@/types/domain';

// Ripple от точки клика — перенесено из code_artifact(2).html. В референсе
// это был <a href="#"> с preventDefault (SPA-имитация); здесь Link ведёт на
// реальный /works?category=..., поэтому preventDefault не вызываем — ripple
// просто проигрывает часть анимации, пока идёт переход, как обычный
// тактильный отклик на тап.
function spawnFilterRipple(event: React.MouseEvent<HTMLAnchorElement>) {
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

export function CategoryFilter({
  categories,
  activeSlug,
  activeColorHex,
}: {
  categories: Category[];
  activeSlug?: string;
  // Тот же цвет, что выбран в ColorFilter. Переносится в URL только когда
  // категория сбрасывается на «Все» (см. hrefFor ниже) — для конкретных
  // категорий цвет сбрасывается, чтобы не улететь в пустую выдачу.
  activeColorHex?: string;
}) {
  // Цвета в фильтре ниже подгружены именно под ТЕКУЩУЮ категорию
  // (getAvailableColors(categorySlug) в page.tsx) — если слепо переносить
  // выбранный цвет на другую категорию, легко получить пустую выдачу без
  // единой подсказки почему (в этой категории такого цвета может просто не
  // быть). Поэтому переносим цвет только на кнопку «Все»: раз цвет уже был
  // доступен в какой-то категории, при сбросе категории он точно останётся
  // непустым. Для конкретных категорий цвет сбрасывается — как и раньше.
  function hrefFor(categorySlug?: string) {
    const params = new URLSearchParams();
    if (categorySlug) params.set('category', categorySlug);
    if (!categorySlug && activeColorHex) params.set('color', activeColorHex);
    const query = params.toString();
    return query ? `/works?${query}` : '/works';
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по категории">
      <Link
        href={hrefFor()}
        onClick={spawnFilterRipple}
        className={`liquid-glass-filter-button inline-flex h-12 items-center border px-7 rounded-full text-[11px] uppercase tracking-[0.12em] transition-colors ${
          !activeSlug ? 'is-active' : ''
        }`}
      >
        Все
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={hrefFor(category.slug)}
          onClick={spawnFilterRipple}
          className={`liquid-glass-filter-button inline-flex h-12 items-center border px-7 rounded-full text-[11px] uppercase tracking-[0.12em] transition-colors ${
            activeSlug === category.slug ? 'is-active' : ''
          }`}
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}
