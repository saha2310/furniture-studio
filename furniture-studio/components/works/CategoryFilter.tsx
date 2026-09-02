import Link from 'next/link';
import type { Category } from '@/types/domain';

export function CategoryFilter({
  categories,
  activeSlug,
}: {
  categories: Category[];
  activeSlug?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтр по категории">
      <Link
        href="/works"
        className={`rounded-full border px-4 py-2 text-sm ${
          !activeSlug ? 'border-ink bg-ink text-canvas' : 'border-stone text-espresso hover:border-ink'
        }`}
      >
        Все
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/works?category=${category.slug}`}
          className={`rounded-full border px-4 py-2 text-sm ${
            activeSlug === category.slug
              ? 'border-ink bg-ink text-canvas'
              : 'border-stone text-espresso hover:border-ink'
          }`}
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}
