'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { WorkColorVariant, WorkWithVariants } from '@/types/domain';
import { WorkGallery } from './WorkGallery';
import { WorkSpecs } from './WorkSpecs';
import { ProjectDescription } from './ProjectDescription';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';

// Быстрый предпросмотр поверх списка — по договорённости НЕ отдельная
// реализация страницы товара, а буквально те же компоненты (WorkGallery,
// WorkSpecs, ProjectDescription), которые рендерит /works/[slug]. Так
// страница товара остаётся единственным источником правды: если она
// поменяется, drawer поменяется вместе с ней сам, без дублирования вёрстки.
//
// Ограничение по данным: список /works грузит полную галерею фото только
// для показанного варианта (work.images), у цветовых "соседей" есть лишь
// обложка (WorkColorVariant.coverImage). Поэтому при переключении цвета
// внутри drawer показываем только его обложку одним кадром, а не полную
// галерею — за полной галереей конкретного цвета ведём на его страницу
// через "Открыть полностью".
export function WorkPreviewDrawer({
  work,
  initialActiveId,
  open,
  onClose,
}: {
  work: WorkWithVariants;
  initialActiveId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [activeId, setActiveId] = useState(initialActiveId);

  useEffect(() => {
    if (open) setActiveId(initialActiveId);
  }, [open, initialActiveId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const active: WorkColorVariant =
    work.colorVariants.find((v) => v.id === activeId) ?? work.colorVariants[0] ?? {
      id: work.id,
      slug: work.slug,
      colorName: work.color_name,
      colorHex: work.color_hex,
      isPrimary: work.is_primary,
      coverImage: work.coverImage,
    };

  const isBaseVariant = active.id === work.id;
  const galleryImages = isBaseVariant ? work.images : active.coverImage ? [active.coverImage] : [];
  const href = `/works/${active.slug}`;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Быстрый просмотр: ${work.title}`}>
      <div className="absolute inset-0 bg-[rgb(var(--photo-mist))]/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-[30rem] flex-col border-l border-ink/10 bg-canvas shadow-2xl animate-[preview-drawer-in_0.28s_ease-out]">
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <p className="eyebrow">Быстрый просмотр</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть предпросмотр"
            className="flex h-8 w-8 items-center justify-center text-ink/50 transition hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-color:rgb(var(--color-ink)/.28)_transparent] [scrollbar-width:thin]">
          {galleryImages.length > 0 ? (
            <div className="relative">
              <WorkGallery images={galleryImages} title={work.title} />
              <FavoriteButton workId={active.id} size="sm" className="absolute right-3 top-3 z-20" />
            </div>
          ) : (
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
              <div className="flex h-full items-center justify-center text-sm text-ink/45">Нет фото</div>
            </div>
          )}

          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-[0.14em] text-ink/45">{work.category?.name}</p>
            <h2 className="mt-2 text-2xl leading-tight tracking-[-0.02em] text-ink">{work.title}</h2>
            {work.price && <p className="mt-2 text-sm text-ink/90">{work.price}</p>}

            {work.colorVariants.length > 1 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {work.colorVariants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    title={variant.colorName ?? undefined}
                    aria-pressed={variant.id === active.id}
                    onClick={() => setActiveId(variant.id)}
                    className={`fabric-swatch shrink-0 transition-transform ${
                      variant.id === active.id ? 'scale-110 outline outline-2 outline-offset-2 outline-ink' : 'hover:scale-105'
                    }`}
                    style={{ '--swatch-color': variant.colorHex ?? undefined } as React.CSSProperties}
                  />
                ))}
              </div>
            )}

            {work.description && <ProjectDescription text={work.description} />}
            <div className="mt-6">
              <WorkSpecs specs={work.specs} />
            </div>
          </div>
        </div>

        <div className="border-t border-ink/10 p-5">
          <Link href={href} className="reference-button w-full justify-center">
            Открыть полностью
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
