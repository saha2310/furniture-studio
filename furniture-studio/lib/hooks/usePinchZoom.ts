'use client';

import { useRef } from 'react';

/**
 * Общая pinch-to-zoom (двумя пальцами) + зум колёсиком/трекпадом логика для
 * диалогов редактирования изображений (ImageCropDialog,
 * CatalogImageSettingsDialog). Раньше такой жест был реализован только в
 * ImageCropDialog — в CatalogImageSettingsDialog («Карточка») зум можно было
 * крутить только ползунком, а пинч на фото ничего не делал (и просто утекал
 * дальше, двигая страницу позади — см. useBodyScrollLock).
 *
 * onPointerDown/onPointerMove возвращают true, когда событие обработано как
 * часть pinch-жеста (второй палец на экране) — в этом случае вызывающий
 * компонент не должен параллельно запускать свою логику перетаскивания одним
 * пальцем поверх того же события.
 */
export function usePinchZoom({
  zoom,
  setZoom,
  min = 1,
  max = 4,
  wheelStep = 0.05,
}: {
  zoom: number;
  setZoom: (value: number | ((current: number) => number)) => void;
  min?: number;
  max?: number;
  wheelStep?: number;
}) {
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  function clampZoom(value: number) {
    return Math.min(max, Math.max(min, Number(value.toFixed(2))));
  }

  function distance() {
    const values = Array.from(pointersRef.current.values());
    if (values.length < 2) return null;
    return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  }

  function onPointerDown(e: React.PointerEvent): boolean {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size >= 2) {
      const d = distance();
      if (d) pinchRef.current = { distance: d, zoom };
      return true;
    }
    return false;
  }

  function onPointerMove(e: React.PointerEvent): boolean {
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = distance();
    if (d && pinchRef.current) {
      setZoom(clampZoom(pinchRef.current.zoom * (d / pinchRef.current.distance)));
      return true;
    }
    return false;
  }

  function onPointerUp(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId);
    pinchRef.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -wheelStep : wheelStep;
    setZoom((value) => clampZoom(value + delta));
  }

  function isPinching() {
    return pointersRef.current.size >= 2;
  }

  return { onPointerDown, onPointerMove, onPointerUp, onWheel, isPinching };
}
