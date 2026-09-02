import Link from 'next/link';
import type { Category } from '@/types/domain';

const DESCRIPTIONS: Record<string, string> = {
  Диваны: 'Основное направление мастерской — прямые, угловые и модульные диваны под конкретный метраж.',
  Кресла: 'Дополняем диваны креслами того же комплекта обивки и посадки — по запросу.',
};

export function WhatWeCreate({ categories, title }: { categories: Category[]; title?: string | null }) {
  if (categories.length === 0) return null;

  return (
    <section className="container-studio py-20">
      <h2 className="max-w-[24ch] text-[clamp(1.6rem,3vw,2.25rem)] leading-tight">
        {title || 'Что мы создаём'}
      </h2>
      <div className="mt-10 grid gap-px overflow-hidden rounded border border-stone/70 bg-stone/70 sm:grid-cols-2">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/works?category=${category.slug}`}
            className="group flex flex-col justify-between bg-canvas p-8 transition-colors hover:bg-surface"
          >
            <p className="font-display text-2xl">{category.name}</p>
            <p className="mt-4 max-w-prose text-[15px] text-espresso">
              {DESCRIPTIONS[category.name] ?? 'Изготавливаем индивидуально под ваш запрос.'}
            </p>
            <span className="mt-6 inline-flex items-center text-sm text-walnut underline-offset-4 group-hover:text-walnutDark group-hover:underline">
              Смотреть работы
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
