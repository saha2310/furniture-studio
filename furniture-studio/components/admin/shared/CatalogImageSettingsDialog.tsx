'use client';

import { useEffect, useRef, useState } from 'react';
import type { WorkImageWithUrl } from '@/types/domain';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { usePinchZoom } from '@/lib/hooks/usePinchZoom';

type Props = {
  image: WorkImageWithUrl;
  onClose: () => void;
  onSaved: (settings: Pick<WorkImageWithUrl, 'catalog_position_x' | 'catalog_position_y' | 'catalog_zoom' | 'catalog_flip_horizontal'>) => void;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function CatalogImageSettingsDialog({ image, onClose, onSaved }: Props) {
  useBodyScrollLock();
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [positionX, setPositionX] = useState(image.catalog_position_x ?? 50);
  const [positionY, setPositionY] = useState(image.catalog_position_y ?? 50);
  const [zoom, setZoom] = useState(image.catalog_zoom ?? 1);
  const pinchZoom = usePinchZoom({ zoom, setZoom });
  const [flipped, setFlipped] = useState(image.catalog_flip_horizontal ?? false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onPointerDown(event: React.PointerEvent) {
    const frame = frameRef.current;
    if (!frame) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    // До этой правки тут был только drag для позиции — второй палец (pinch)
    // никак не обрабатывался и просто утекал наружу, двигая страницу под
    // диалогом (см. useBodyScrollLock и usePinchZoom).
    if (pinchZoom.onPointerDown(event)) { dragRef.current = null; return; }
    dragRef.current = { x: event.clientX, y: event.clientY, ox: positionX, oy: positionY };
  }

  function onPointerMove(event: React.PointerEvent) {
    if (pinchZoom.onPointerMove(event)) return;
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame) return;
    setPositionX(clamp(drag.ox - ((event.clientX - drag.x) / frame.clientWidth) * 100, 0, 100));
    setPositionY(clamp(drag.oy - ((event.clientY - drag.y) / frame.clientHeight) * 100, 0, 100));
  }

  function stopDrag(event: React.PointerEvent) {
    pinchZoom.onPointerUp(event);
    dragRef.current = null;
  }

  // Ничего не пишет на сервер: только передаёт выбранные значения наверх, в
  // WorkImageEditor, который держит их как несохранённые и отправляет вместе
  // с остальной формой по нажатию общей кнопки «Сохранить изменения».
  function save() {
    onSaved({
      catalog_position_x: Number(positionX.toFixed(2)),
      catalog_position_y: Number(positionY.toFixed(2)),
      catalog_zoom: Number(zoom.toFixed(2)),
      catalog_flip_horizontal: flipped,
    });
    onClose();
  }

  function reset() {
    setPositionX(50); setPositionY(50); setZoom(1); setFlipped(false);
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col border border-ink/15 bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4 sm:px-6">
          <div>
            <p className="eyebrow">карточка каталога</p>
            <h2 className="mt-1 text-lg text-ink">Настройка изображения для /works</h2>
            <p className="mt-1 text-xs text-ink/45">Исходная фотография не изменяется. Положение, масштаб и зеркалирование применятся при общем сохранении формы.</p>
          </div>
          <button type="button" onClick={onClose} className="text-3xl leading-none text-ink/55 hover:text-ink" aria-label="Закрыть">×</button>
        </div>

        <div className="grid min-h-0 gap-5 overflow-auto p-5 lg:grid-cols-[minmax(0,1fr),240px] sm:p-6">
          <div
            ref={frameRef}
            className="relative aspect-[4/3] overflow-hidden border border-ink/10 bg-black touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            onWheel={pinchZoom.onWheel}
          >
            <img
              src={image.url}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full select-none object-cover transition-transform duration-100"
              style={{ objectPosition: `${positionX}% ${positionY}%`, transform: `scale(${zoom}) scaleX(${flipped ? -1 : 1})` }}
            />
            <div className="pointer-events-none absolute inset-0 border border-white/20" />
            <span className="pointer-events-none absolute bottom-3 left-3 bg-black/60 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white/75">Перетащите фото · сведите пальцы, чтобы приблизить</span>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-ink/45"><span>Масштаб</span><span>{zoom.toFixed(2)}×</span></div>
              <input type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="mt-3 w-full" />
            </div>
            <button type="button" onClick={() => setFlipped((value) => !value)} className={`flex w-full items-center justify-between border px-3 py-3 text-[10px] uppercase tracking-[0.12em] ${flipped ? 'border-ink bg-ink text-canvas' : 'border-ink/15 text-ink/70 hover:border-ink/40'}`}>
              <span>↔ Зеркалить</span><span>{flipped ? 'Вкл.' : 'Выкл.'}</span>
            </button>
            <button type="button" onClick={reset} className="w-full border border-ink/10 px-3 py-3 text-[10px] uppercase tracking-[0.12em] text-ink/55 hover:border-ink/30 hover:text-ink">Сбросить</button>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 border border-ink/15 px-3 py-3 text-[10px] uppercase tracking-[0.12em] text-ink/65">Отмена</button>
              <button type="button" onClick={save} className="flex-1 bg-ink px-3 py-3 text-[10px] uppercase tracking-[0.12em] text-canvas">Применить</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
