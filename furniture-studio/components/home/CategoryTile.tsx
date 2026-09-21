'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { CategoryWithChildren } from '@/types/domain';
import { workImageUrl } from '@/lib/utils/image';
import { SubcategoryDialog } from '@/components/works/SubcategoryDialog';

// «1 подвид», «2 подвида», «5 подвидов», «21 подвид», «12 подвидов».
function subtypesLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} подвид`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} подвида`;
  return `${count} подвидов`;
}

// Карточка категории на главной — по референсу «сочной» карточки-кнопки:
// скруглённая тёмная карточка с фото на весь фон, нижним градиентом,
// «стеклянным» номером слева сверху и подписью «Каталог /» справа. При
// наведении карточка приподнимается, фото плавно увеличивается и
// чуть поворачивается, блок с текстом сдвигается вверх, а у строки внизу
// удлиняется линия и уезжает стрелка.
//
// Карточка всегда тёмная, в том числе в светлой теме сайта: поверх фото
// нужен светлый текст, поэтому цвета здесь заданы явно (text-white/…), а не
// через text-ink, который в light mode тёмный. Поэтому же не нужен и
// .light-image-content — он лишь подменял ink на светлый цвет.
//
// Если у категории есть подкатегории (например, «Диваны» → «Угловые»,
// «Прямые»), клик открывает окно выбора: «Все диваны» или конкретный
// подвид. Категория без подкатегорий ведёт на /works?category=... напрямую,
// без лишнего клика.
export function CategoryTile({
  category,
  index,
  description,
}: {
  category: CategoryWithChildren;
  index: number;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = category.children.length > 0;

  const cardClassName =
    'group relative isolate flex min-h-[340px] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#1d1d1b] p-6 text-left shadow-[0_10px_30px_rgba(0,0,0,0.28)] transition-[transform,box-shadow] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(255,255,255,0.06)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:min-h-[380px] sm:p-8 lg:min-h-[420px]';

  const cardInner = (
    <>
      {category.image_path ? (
        <Image
          src={workImageUrl(category.image_path)}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="pointer-events-none object-cover opacity-75 transition-transform duration-700 ease-out group-hover:rotate-[1deg] group-hover:scale-[1.08] motion-reduce:transition-none motion-reduce:group-hover:transform-none"
        />
      ) : (
        // Без фото — тёмный градиент (в тон тёмной темы сайта), чтобы белый
        // текст оставался читаемым и в светлой теме.
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_45%,#47413a,#211f1c_45%,#111110_75%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0a] via-[#0b0b0a]/60 to-transparent transition-opacity duration-700 group-hover:opacity-95" />

      <div className="relative z-10 flex items-start justify-between gap-6">
        <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[12px] font-medium tracking-widest text-white/60 backdrop-blur-md transition-all duration-300 group-hover:bg-white/20 group-hover:text-white">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-white/70 transition-transform duration-500 ease-out group-hover:translate-x-2 motion-reduce:transition-none motion-reduce:group-hover:transform-none">
          Каталог <span className="text-white/40">/</span>
        </span>
      </div>

      <div className="relative z-10 mt-12 transition-transform duration-500 ease-out group-hover:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover:transform-none">
        <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white drop-shadow-sm transition-colors duration-300 group-hover:text-amber-100 sm:text-3xl">
          {category.name}
        </h3>
        <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-white/75 transition-colors duration-300 group-hover:text-white/90">
          {description}
        </p>
        <p className="mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
          {hasChildren && <span>{subtypesLabel(category.children.length)}</span>}
          <span className="h-px w-3 bg-white/40 transition-all duration-300 group-hover:w-6 group-hover:bg-white" />
          <span className="flex items-center gap-1 text-white transition-transform duration-300 group-hover:translate-x-2 motion-reduce:transition-none motion-reduce:group-hover:transform-none">
            {hasChildren ? 'выбрать' : 'смотреть'}
            <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </p>
      </div>
    </>
  );

  if (!hasChildren) {
    return (
      <Link href={`/works?category=${category.slug}`} className={cardClassName}>
        {cardInner}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={cardClassName}>
        {cardInner}
      </button>

      {open && <SubcategoryDialog category={category} onClose={() => setOpen(false)} hrefFor={(slug) => `/works?category=${slug}`} />}
    </>
  );
}
