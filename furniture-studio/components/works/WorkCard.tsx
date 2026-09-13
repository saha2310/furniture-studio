'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { WorkColorVariant, WorkWithVariants } from '@/types/domain';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';

const CARD_DESCRIPTION_LIMIT = 105;
// Больше 4 цветов на карточке уже не помещаются — показываем первые 4
// кружками и остаток одной подписью «+N», по клику на неё также можно
// открыть товар (в текущем — активном — цвете).
const VISIBLE_SWATCHES = 4;

function ColorSwatches({
  variants,
  activeId,
  onSelect,
}: {
  variants: WorkColorVariant[];
  activeId: string;
  onSelect: (variant: WorkColorVariant) => void;
}) {
  if (variants.length < 2) return null;

  const visible = variants.slice(0, VISIBLE_SWATCHES);
  const restCount = variants.length - visible.length;

  return (
    <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {visible.map((variant) => (
        <button
          key={variant.id}
          type="button"
          title={variant.colorName ?? undefined}
          aria-label={variant.colorName ?? 'Цвет'}
          aria-pressed={variant.id === activeId}
          onClick={(e) => { e.preventDefault(); onSelect(variant); }}
          className={`fabric-swatch shrink-0 transition-transform ${
            variant.id === activeId ? 'scale-110 outline outline-2 outline-offset-2 outline-ink' : 'hover:scale-105'
          }`}
          style={{ '--swatch-color': variant.colorHex ?? undefined } as React.CSSProperties}
        />
      ))}
      {restCount > 0 && <span className="text-[11px] uppercase tracking-[0.08em] text-ink/50">+{restCount}</span>}
    </div>
  );
}

export function WorkCard({ work, priority = false }: { work: WorkWithVariants; priority?: boolean }) {
  const description = work.description ?? '';
  const preview = description.length > CARD_DESCRIPTION_LIMIT
    ? `${description.slice(0, CARD_DESCRIPTION_LIMIT).trimEnd()}…`
    : description;

  // По умолчанию карточка показывает свой основной вариант; клик по свотчу
  // временно (только визуально, без перехода) переключает превью на другой
  // цвет, а ссылка карточки ведёт уже на выбранный вариант.
  const [active, setActive] = useState<WorkColorVariant>(() =>
    work.colorVariants.find((v) => v.id === work.id) ?? work.colorVariants[0] ?? {
      id: work.id,
      slug: work.slug,
      colorName: work.color_name,
      colorHex: work.color_hex,
      isPrimary: work.is_primary,
      coverImage: work.coverImage,
    },
  );

  const activeImage = active.coverImage ?? work.coverImage;
  const activeHref = `/works/${active.slug}`;

  return (
    <article className="group border border-ink/10 bg-surface">
      <div className="relative">
        <Link href={activeHref} className="block">
          <div className="relative aspect-[4/3] overflow-hidden bg-surface">
            {activeImage ? <Image src={activeImage.url} alt={activeImage.alt_text || work.title} fill priority={priority} sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]" /> : <div className="flex h-full items-center justify-center text-sm text-ink/45">Нет фото</div>}
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(var(--photo-mist)/0.45),transparent,transparent)]" />
          </div>
        </Link>
        <FavoriteButton workId={work.id} size="sm" className="absolute right-3 top-3 z-20" />
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-ink/50"><span>{String(work.sort_order + 1).padStart(2, '0')}</span><span className="h-px flex-1 bg-ink/10" /><span>{work.category?.name}</span></div>
        <div className="mt-7 flex items-start justify-between gap-5">
          <div className="min-w-0">
            <Link href={activeHref} className="text-[19px] tracking-[-0.02em] text-ink hover:text-ink/80">{work.title}</Link>
            {work.price && <p className="mt-2 text-[12px] text-ink/90">{work.price}</p>}
            {description && (
              <p className="mt-3 h-[3.75rem] max-w-[34ch] overflow-hidden break-words text-[12px] leading-5 text-ink/72 [overflow-wrap:anywhere]">
                {preview}
              </p>
            )}
            <ColorSwatches variants={work.colorVariants} activeId={active.id} onSelect={setActive} />
          </div>
          <Link href={activeHref} className="shrink-0 pt-1 text-[11px] uppercase tracking-[0.12em] text-ink/65 transition-transform duration-500 group-hover:translate-x-1 group-hover:text-ink">Смотреть →</Link>
        </div>
      </div>
    </article>
  );
}
