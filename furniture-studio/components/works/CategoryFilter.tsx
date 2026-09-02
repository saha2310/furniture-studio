import Link from 'next/link';
import type { Category } from '@/types/domain';

export function CategoryFilter({ categories, activeSlug }: { categories: Category[]; activeSlug?: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по категории">
      <Link
        href="/works"
        className={`inline-flex h-10 items-center border px-5 text-[11px] uppercase tracking-[0.12em] transition-colors ${
          !activeSlug ? 'border-ink bg-ink text-canvas' : 'border-white/20 text-espresso hover:border-white/45 hover:text-white'
        }`}
      >
        Все
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/works?category=${category.slug}`}
          className={`inline-flex h-10 items-center border px-5 text-[11px] uppercase tracking-[0.12em] transition-colors ${
            activeSlug === category.slug ? 'border-ink bg-ink text-canvas' : 'border-white/20 text-espresso hover:border-white/45 hover:text-white'
          }`}
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}
