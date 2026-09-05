import Link from 'next/link';
import type { Category } from '@/types/domain';

export function CategoryFilter({ categories, activeSlug }: { categories: Category[]; activeSlug?: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по категории">
      <Link
        href="/works"
        className={`liquid-glass-filter-button inline-flex h-12 items-center border px-7 rounded-full text-[11px] uppercase tracking-[0.12em] transition-colors ${
          !activeSlug ? 'is-active' : ''
        }`}
      >
        Все
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/works?category=${category.slug}`}
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
