import Link from 'next/link';
import type { CategoryWorkCount } from '@/lib/queries/dashboard';

// Прогресс-бар относительно самой заполненной категории (а не относительно
// суммы всех работ) — так разброс между категориями виден нагляднее: при
// делении на сумму все бары были бы мелкими и почти неотличимыми друг от
// друга, если категорий много.
export function CategoryBreakdownCard({ categories }: { categories: CategoryWorkCount[] }) {
  const max = Math.max(1, ...categories.map((c) => c.count));

  return (
    <div className="border border-ink/10 bg-surface">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <h2 className="text-sm font-medium text-ink">Категории</h2>
        <Link href="/admin/categories" className="text-xs text-espresso hover:text-ink hover:underline">
          Все категории →
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-ink/50">Категорий пока нет.</p>
      ) : (
        <ul className="divide-y divide-ink/10">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-4 px-5 py-3">
              <span className="w-28 shrink-0 truncate text-sm text-ink">{category.name}</span>
              <span className="w-5 shrink-0 text-right text-sm text-ink/50">{category.count}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${(category.count / max) * 100}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
