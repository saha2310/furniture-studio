import Link from 'next/link';
import type { Category } from '@/types/domain';
import { workImageUrl } from '@/lib/utils/image';

const DESCRIPTIONS: Record<string, string> = {
  Диваны: 'Прямые, угловые и модульные решения под конкретный метраж и сценарий жизни.',
  Кресла: 'Кресла в той же логике формы, посадки и ткани — как часть целого интерьера.',
};

export function WhatWeCreate({ categories, title }: { categories: Category[]; title?: string | null }) {
  if (categories.length === 0) return null;

  return (
    <section className="border-b border-white/10 bg-[#171716]">
      <div className="container-studio grid gap-12 py-24 lg:grid-cols-[.75fr,1.5fr] lg:gap-20">
        <div>
          <p className="eyebrow">направления</p>
          <h2 className="display-title mt-5 max-w-[10ch]">{title || 'Что мы создаём'}</h2>
        </div>
        <div className="grid border-t border-white/10 sm:grid-cols-2">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={`/works?category=${category.slug}`}
              className="group relative isolate flex min-h-[250px] overflow-hidden flex-col justify-between border-b border-white/10 p-6 transition-colors hover:bg-white/[0.03] sm:border-r sm:p-8 lg:min-h-[300px]"
            >
              {category.image_path && <img src={workImageUrl(category.image_path)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-700 group-hover:scale-[1.04]" />}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 transition-opacity duration-700 group-hover:opacity-95" />
              <div className="relative z-10 flex items-start justify-between gap-6">
                <span className="text-[12px] text-white/65">0{index + 1}</span>
                <span className="text-sm text-white/65 transition-transform duration-500 group-hover:translate-x-2">↗</span>
              </div>
              <div className="relative z-10">
                <h3 className="text-3xl font-semibold tracking-[-0.03em]">{category.name}</h3>
                <p className="mt-4 max-w-[32ch] text-sm leading-6 text-white/82">
                  {DESCRIPTIONS[category.name] ?? 'Изготавливаем индивидуально под ваш запрос.'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
