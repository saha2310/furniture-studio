import type { CategoryWithChildren } from '@/types/domain';
import { CategoryTile } from './CategoryTile';

const DESCRIPTIONS: Record<string, string> = {
  Диваны: 'Прямые, угловые и модульные решения под конкретный метраж и сценарий жизни.',
  Кресла: 'Кресла в той же логике формы, посадки и ткани — как часть целого интерьера.',
};

export function WhatWeCreate({ categories, title }: { categories: CategoryWithChildren[]; title?: string | null }) {
  if (categories.length === 0) return null;

  return (
    <section className="border-b border-ink/10 bg-surface">
      <div className="container-studio grid gap-12 py-24 lg:grid-cols-[.75fr,1.5fr] lg:gap-20">
        <div>
          <p className="eyebrow">направления</p>
          <h2 className="display-title mt-5 max-w-[10ch]">{title || 'Что мы создаём'}</h2>
        </div>
        {/*
          Линии между плитками намеренно чуть контрастнее (ink/20 вместо
          прежних 10%) — сетка остаётся "слитной" без внешних отступов
          между карточками, но границы между ними теперь читаются на глаз,
          а не сливаются в одно пятно поверх фотографий. Цвет линии — ink,
          поэтому в светлой теме она тёмная, а не белая.
        */}
        <div className="grid border-t border-ink/20 sm:grid-cols-2">
          {categories.map((category, index) => (
            <CategoryTile
              key={category.id}
              category={category}
              index={index}
              description={DESCRIPTIONS[category.name] ?? 'Изготавливаем индивидуально под ваш запрос.'}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
