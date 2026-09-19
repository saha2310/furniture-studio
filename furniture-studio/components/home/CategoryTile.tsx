'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { CategoryWithChildren } from '@/types/domain';
import { workImageUrl } from '@/lib/utils/image';
import { SubcategoryDialog } from '@/components/works/SubcategoryDialog';

// Плитка категории на главной. Если у категории есть подкатегории
// (например, «Диваны» → «Угловые», «Прямые»), клик не ведёт сразу на
// /works — вместо этого открывается модалка с выбором: «Все диваны» или
// конкретный подвид. Категория без подкатегорий по-прежнему ведёт на
// /works?category=... напрямую, как раньше (никакого лишнего клика).
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

  const tileClassName =
    'light-image-content create-card group relative isolate flex min-h-[250px] w-full overflow-hidden flex-col justify-between border-b border-ink/20 p-6 text-left transition-[box-shadow,transform] duration-500 hover:-translate-y-0.5 hover:shadow-[0_22px_58px_rgba(0,0,0,0.24)] sm:border-r sm:p-8 lg:min-h-[300px]';

  const tileInner = (
    <>
      {category.image_path && (
        <Image
          src={workImageUrl(category.image_path)}
          alt=""
          fill
          sizes="(min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover opacity-100 transition-transform duration-700 group-hover:scale-[1.04]"
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,transparent,rgb(var(--photo-mist)/0.8))] transition-opacity duration-700 group-hover:opacity-95" />
      <div className="relative z-10 flex items-start justify-between gap-6">
        <span className="text-[12px] text-ink/65">0{index + 1}</span>
        <span className="text-sm text-ink/65 transition-transform duration-500 group-hover:translate-x-2">↗</span>
      </div>
      <div className="relative z-10">
        <h3 className="text-3xl font-semibold tracking-[-0.03em]">{category.name}</h3>
        <p className="mt-4 max-w-[32ch] text-sm leading-6 text-ink/82">{description}</p>
        {hasChildren && (
          <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-ink/50">{category.children.length} подвида — выбрать →</p>
        )}
      </div>
    </>
  );

  if (!hasChildren) {
    return (
      <Link href={`/works?category=${category.slug}`} className={tileClassName}>
        {tileInner}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={tileClassName}>
        {tileInner}
      </button>

      {open && <SubcategoryDialog category={category} onClose={() => setOpen(false)} hrefFor={(slug) => `/works?category=${slug}`} />}
    </>
  );
}
