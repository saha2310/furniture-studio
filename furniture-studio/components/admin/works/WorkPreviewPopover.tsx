'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WorkWithUrls } from '@/types/domain';

const OPEN_DELAY_MS = 800;
const CLOSE_DELAY_MS = 150;
const PANEL_WIDTH = 340;

function supportsHover(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[92px,1fr] gap-3 border-b border-ink/10 px-4 py-2.5 last:border-0">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-ink/40">{label}</dt>
      <dd className="min-w-0 text-sm leading-5 text-ink/85">{children}</dd>
    </div>
  );
}

// Всплывающее окно с полной карточкой товара: на ПК открывается по наведению
// на описание (с задержкой ~0.8с) и остаётся открытым, пока курсор внутри
// него; на телефоне (нет hover) — по нажатию. Рендерится порталом в body,
// чтобы не обрезаться overflow-контейнерами карточек в сетке.
export function WorkPreviewPopover({ work }: { work: WorkWithUrls }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearOpenTimer() {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
  }
  function clearCloseTimer() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }

  function computePosition() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const estimatedHeight = 340;

    let left = rect.left;
    left = Math.min(left, viewportWidth - PANEL_WIDTH - 12);
    left = Math.max(left, 12);

    let top = rect.bottom + 8;
    if (top + estimatedHeight > viewportHeight) {
      top = Math.max(12, rect.top - estimatedHeight - 8);
    }
    setPosition({ top, left });
  }

  function openNow() {
    computePosition();
    setOpen(true);
  }

  function scheduleOpen() {
    clearCloseTimer();
    if (open) return;
    openTimer.current = setTimeout(openNow, OPEN_DELAY_MS);
  }

  function scheduleClose() {
    clearOpenTimer();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  function handleTriggerClick() {
    clearOpenTimer();
    clearCloseTimer();
    if (open) setOpen(false);
    else openNow();
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  useEffect(() => () => { clearOpenTimer(); clearCloseTimer(); }, []);

  const specsEntries = work.specs ? Object.entries(work.specs).filter(([, value]) => value?.trim()) : [];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => { if (supportsHover()) scheduleOpen(); }}
        onMouseLeave={() => { if (supportsHover()) { clearOpenTimer(); if (open) scheduleClose(); } }}
        onClick={handleTriggerClick}
        className="line-clamp-2 min-h-[2.5em] w-full text-left text-xs leading-5 text-ink/50 hover:text-ink/70"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {work.description?.trim() || 'Описание не задано.'}
      </button>

      {open && position && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          onMouseEnter={() => { if (supportsHover()) clearCloseTimer(); }}
          onMouseLeave={() => { if (supportsHover()) scheduleClose(); }}
          style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
          className="fixed z-[200] max-h-[70vh] overflow-y-auto border border-ink/15 bg-surface shadow-2xl"
          role="dialog"
          aria-label={`Предпросмотр: ${work.title}`}
        >
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-2.5">
            <p className="truncate text-xs uppercase tracking-[0.12em] text-ink/45">Предпросмотр</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть предпросмотр" className="text-ink/40 hover:text-ink">✕</button>
          </div>

          <dl>
            <Row label="Название">{work.title}</Row>
            <Row label="Категория">{work.category?.name ?? '—'}</Row>
            <Row label="Статус">
              <span className={work.status === 'published' ? 'text-emerald-400/90' : 'text-ink/50'}>
                {work.status === 'published' ? '● Опубликовано' : '○ Скрыто'}
              </span>
            </Row>
            <Row label="Цвет">
              {work.color_name || work.color_hex ? (
                <span className="flex items-center gap-1.5">
                  {work.color_hex && <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink/20" style={{ backgroundColor: work.color_hex }} />}
                  <span className="truncate">{work.color_name || work.color_hex}</span>
                </span>
              ) : '—'}
            </Row>
            <Row label="Описание">
              <span className="whitespace-pre-wrap">{work.description?.trim() || 'Не указано.'}</span>
            </Row>
            <Row label="Параметры">
              {specsEntries.length > 0 ? (
                <ul className="space-y-1">
                  {specsEntries.map(([key, value]) => (
                    <li key={key} className="flex justify-between gap-3 text-ink/70">
                      <span className="text-ink/45">{key}</span>
                      <span className="text-right">{value}</span>
                    </li>
                  ))}
                </ul>
              ) : '—'}
            </Row>
            <Row label="Цена">{work.price?.trim() || 'Договорная'}</Row>
          </dl>
        </div>,
        document.body
      )}
    </>
  );
}
