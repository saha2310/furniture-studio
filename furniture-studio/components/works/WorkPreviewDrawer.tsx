'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { WORK_PREVIEW_CLOSE_EVENT } from '@/lib/utils/work-preview';
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
// Окно рендерится порталом прямо в <body>: раньше оно жило внутри карточки,
// а у карточек есть transform (анимация появления, hover) — из-за этого
// position: fixed считался от карточки, и соседние элементы оказывались
// поверх предпросмотра.
//
// Телефон (< 768px): «шторка» снизу. Закрыть — крестик, тап по затемнению,
// свайп вниз (когда содержимое прокручено до самого верха или тянут за
// «ручку»), либо кнопка «Работы» в нижнем меню (см. MobileBottomNav —
// событие WORK_PREVIEW_CLOSE_EVENT; страница при этом не перезагружается).
const CLOSE_MS = 260;
const SWIPE_CLOSE_PX = 110;

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
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      delete panelRef.current?.dataset.swiped;
      setActiveId(initialActiveId);
      setClosing(false);
      closingRef.current = false;
    }
  }, [open, initialActiveId]);

  // Плавное закрытие: сначала анимация ухода, потом onClose.
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    const panel = panelRef.current;
    if (panel) {
      panel.style.transition = '';
      panel.style.transform = '';
    }
    window.setTimeout(onClose, CLOSE_MS);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root.dataset.workPreview = 'open';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') requestClose();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener(WORK_PREVIEW_CLOSE_EVENT, requestClose);
    return () => {
      document.body.style.overflow = previousOverflow;
      delete root.dataset.workPreview;
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(WORK_PREVIEW_CLOSE_EVENT, requestClose);
    };
  }, [open, requestClose]);

  // Свайп вниз на телефоне. Тянуть можно за «ручку»/шапку всегда, а за
  // содержимое — только когда оно уже прокручено до самого верха.
  useEffect(() => {
    if (!open || !mounted) return;
    const panel = panelRef.current;
    if (!panel) return;
    const isPhone = () => window.matchMedia('(max-width: 767px)').matches;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let dy = 0;
    let tracking = false;
    let dragging = false;

    function onStart(e: TouchEvent) {
      if (!isPhone() || closingRef.current || e.touches.length !== 1) return;
      const target = e.target as HTMLElement;
      const fromHandle = !!target.closest('[data-sheet-handle]');
      const atTop = (scrollRef.current?.scrollTop ?? 0) <= 0;
      tracking = fromHandle || atTop;
      dragging = false;
      dy = 0;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startT = performance.now();
    }

    function onMove(e: TouchEvent) {
      if (!tracking || !panel) return;
      const moveX = e.touches[0].clientX - startX;
      const moveY = e.touches[0].clientY - startY;
      if (!dragging) {
        // Ждём явного движения вниз; горизонтальный свайп — это листание фото.
        if (Math.abs(moveY) < 8 && Math.abs(moveX) < 8) return;
        if (moveY <= 0 || Math.abs(moveX) > Math.abs(moveY)) {
          tracking = false;
          return;
        }
        dragging = true;
        panel.style.transition = 'none';
      }
      dy = Math.max(0, moveY);
      panel.style.transform = `translateY(${dy}px)`;
      if (e.cancelable) e.preventDefault();
    }

    function onEnd() {
      if (!dragging || !panel) {
        tracking = false;
        return;
      }
      tracking = false;
      dragging = false;
      const velocity = dy / Math.max(1, performance.now() - startT);
      if (dy > SWIPE_CLOSE_PX || (dy > 40 && velocity > 0.6)) {
        panel.dataset.swiped = '1';
        panel.style.transition = `transform ${CLOSE_MS}ms ease-in`;
        panel.style.transform = 'translateY(100%)';
        closingRef.current = true;
        setClosing(true);
        window.setTimeout(onClose, CLOSE_MS);
      } else {
        panel.style.transition = 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)';
        panel.style.transform = '';
      }
    }

    panel.addEventListener('touchstart', onStart, { passive: true });
    panel.addEventListener('touchmove', onMove, { passive: false });
    panel.addEventListener('touchend', onEnd);
    panel.addEventListener('touchcancel', onEnd);
    return () => {
      panel.removeEventListener('touchstart', onStart);
      panel.removeEventListener('touchmove', onMove);
      panel.removeEventListener('touchend', onEnd);
      panel.removeEventListener('touchcancel', onEnd);
    };
  }, [open, mounted, onClose]);

  if (!open || !mounted) return null;

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

  return createPortal(
    <div
      className={`work-preview fixed inset-0 z-[85] ${closing ? 'is-closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Быстрый просмотр: ${work.title}`}
    >
      <div className="work-preview-backdrop absolute inset-0 bg-[rgb(var(--photo-mist))]/70 backdrop-blur-sm" onClick={requestClose} />
      <div ref={panelRef} className="work-preview-panel absolute flex flex-col bg-canvas shadow-2xl">
        <div data-sheet-handle className="work-preview-handle md:hidden" aria-hidden="true">
          <span />
        </div>
        <div data-sheet-handle className="flex items-center justify-between gap-3 border-b border-ink/10 px-5 py-3 md:py-4">
          <p className="eyebrow">Быстрый просмотр</p>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Закрыть предпросмотр"
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-lg text-ink/60 transition hover:bg-ink/5 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-color:rgb(var(--color-ink)/.28)_transparent] [scrollbar-width:thin]">
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

        <div className="work-preview-footer border-t border-ink/10 p-5">
          <Link href={href} className="reference-button w-full justify-center">
            Открыть полностью
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
