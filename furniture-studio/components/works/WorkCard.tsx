'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { WorkColorVariant, WorkWithVariants } from '@/types/domain';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { WorkPreviewDrawer } from './WorkPreviewDrawer';

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

// Компактные метки характеристик (Форма, Каркас…) — журнальный вариант
// показывает пару первых, чтобы карточка несла больше информации, не
// превращаясь в полное описание товара (за этим — предпросмотр/страница).
function SpecTeaser({ specs }: { specs: Record<string, string> | null }) {
  if (!specs) return null;
  const entries = Object.entries(specs).filter(([, v]) => v?.trim()).slice(0, 2);
  if (entries.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
      {entries.map(([key, value]) => (
        <div key={key} className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.14em] text-ink/40">{key}</p>
          <p className="truncate text-[13px] text-ink/75">{value}</p>
        </div>
      ))}
    </div>
  );
}

export function WorkCard({
  work,
  priority = false,
  variant = 'grid',
}: {
  work: WorkWithVariants;
  priority?: boolean;
  // 'grid' — компактная карточка (главная, избранное): фото сверху, минимум
  // текста, как было изначально. 'journal' — более просторная раскладка для
  // /works при плотности 2–3 карточки в ряд: фото и инфопанель бок о бок,
  // акцентная обводка в цвет обивки при hover, крупный номер, тизер
  // характеристик и кнопка быстрого предпросмотра (открывает WorkPreviewDrawer
  // с теми же данными и компонентами, что использует страница товара).
  variant?: 'grid' | 'journal';
}) {
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
  const [previewOpen, setPreviewOpen] = useState(false);

  const activeImage = active.coverImage ?? work.coverImage;
  const activeHref = `/works/${active.slug}`;
  const accentColor = active.colorHex ?? undefined;

  if (variant === 'journal') {
    return (
      <>
        <article
          className="group flex flex-col overflow-hidden border border-ink/10 bg-surface transition-colors duration-300 hover:[border-color:var(--card-accent,rgb(var(--color-ink)/0.25))] sm:flex-row"
          style={{ '--card-accent': accentColor } as React.CSSProperties}
        >
          <div className="relative sm:w-[54%] sm:shrink-0">
            <Link href={activeHref} className="block h-full">
              <div className="relative aspect-[4/3] h-full overflow-hidden bg-surface">
                {activeImage ? (
                  <Image
                    src={activeImage.url}
                    alt={activeImage.alt_text || work.title}
                    fill
                    priority={priority}
                    sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 45vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-ink/45">Нет фото</div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(var(--photo-mist)/0.4),transparent,transparent)]" />
              </div>
            </Link>
            <span className="pointer-events-none absolute left-3 top-3 text-[34px] font-light leading-none tracking-[-0.03em] text-canvas mix-blend-difference">
              {String(work.sort_order + 1).padStart(2, '0')}
            </span>
            <FavoriteButton workId={work.id} size="sm" className="absolute right-3 top-3 z-20" />
          </div>

          <div className="flex flex-1 flex-col justify-between p-6 lg:p-7">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-ink/50">{work.category?.name}</p>
              <Link href={activeHref} className="mt-3 block text-[22px] leading-tight tracking-[-0.02em] text-ink hover:text-ink/80 lg:text-[24px]">
                {work.title}
              </Link>
              {work.price && <p className="mt-2 text-[13px] text-ink/90">{work.price}</p>}

              <ColorSwatches variants={work.colorVariants} activeId={active.id} onSelect={setActive} />
              <SpecTeaser specs={work.specs} />
            </div>

            <div className="mt-6 flex items-center gap-4 border-t border-ink/10 pt-4">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="text-[11px] uppercase tracking-[0.12em] text-ink/65 transition hover:text-ink"
              >
                Быстрый просмотр
              </button>
              <span className="h-3 w-px bg-ink/15" />
              <Link
                href={activeHref}
                className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-ink/65 transition-transform duration-500 hover:text-ink group-hover:translate-x-1"
              >
                Смотреть <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </article>

        <WorkPreviewDrawer work={work} initialActiveId={active.id} open={previewOpen} onClose={() => setPreviewOpen(false)} />
      </>
    );
  }

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
            <div className="min-h-[3.4rem]">
              <Link href={activeHref} className="line-clamp-2 text-[19px] leading-snug tracking-[-0.02em] text-ink hover:text-ink/80">{work.title}</Link>
            </div>
            {work.price && <p className="mt-2 text-[12px] text-ink/90">{work.price}</p>}
            <ColorSwatches variants={work.colorVariants} activeId={active.id} onSelect={setActive} />
          </div>
          <Link href={activeHref} className="shrink-0 pt-1 text-[11px] uppercase tracking-[0.12em] text-ink/65 transition-transform duration-500 group-hover:translate-x-1 group-hover:text-ink">Смотреть →</Link>
        </div>
      </div>
    </article>
  );
}
