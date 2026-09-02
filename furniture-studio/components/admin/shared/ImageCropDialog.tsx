'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export const IMAGE_RATIOS = [
  { label: 'Свободный', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:5', value: 4 / 5 },
] as const;

type Props = {
  sourceUrl: string;
  title?: string;
  initialRatio?: number | null;
  onCancel: () => void;
  onApply: (file: File, previewUrl: string) => void;
};

export function ImageCropDialog({ sourceUrl, title = 'Редактор изображения', initialRatio = 4 / 3, onCancel, onApply }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [image, setImage] = useState<{ url: string; width: number; height: number } | null>(null);
  const [ratio, setRatio] = useState<number | null>(initialRatio);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [frame, setFrame] = useState({ width: 680, height: 520 });
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    async function load() {
      try {
        let url = sourceUrl;
        if (!sourceUrl.startsWith('blob:') && !sourceUrl.startsWith('data:')) {
          const response = await fetch(sourceUrl, { cache: 'no-store' });
          if (!response.ok) throw new Error('Не удалось загрузить изображение');
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          url = objectUrl;
        }

        const img = new window.Image();
        img.onload = () => {
          if (!active) return;
          setImage({ url, width: img.naturalWidth, height: img.naturalHeight });
          setRatio((current) => current === null ? null : current);
          setOffset({ x: 0, y: 0 });
          setZoom(1);
        };
        img.onerror = () => setError('Не удалось открыть изображение для редактирования.');
        img.src = url;
      } catch {
        setError('Не удалось загрузить изображение для редактирования.');
      }
    }

    load();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceUrl]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(320, Math.floor(entry.contentRect.width));
      const height = Math.max(320, Math.floor(entry.contentRect.height));
      setFrame({ width, height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const cropRatio = useMemo(() => {
    if (ratio) return ratio;
    if (image) return image.width / image.height;
    return 4 / 3;
  }, [image, ratio]);

  const cropFrame = useMemo(() => {
    const padding = 28;
    const maxW = frame.width - padding * 2;
    const maxH = frame.height - padding * 2;
    let width = maxW;
    let height = width / cropRatio;
    if (height > maxH) {
      height = maxH;
      width = height * cropRatio;
    }
    return { width, height };
  }, [frame, cropRatio]);

  const baseScale = useMemo(() => {
    if (!image) return 1;
    return Math.max(cropFrame.width / image.width, cropFrame.height / image.height);
  }, [image, cropFrame]);

  const rendered = useMemo(() => {
    if (!image) return null;
    const scale = baseScale * zoom;
    return { width: image.width * scale, height: image.height * scale };
  }, [image, baseScale, zoom]);

  function clampOffset(next: { x: number; y: number }) {
    if (!rendered) return next;
    const maxX = Math.max(0, (rendered.width - cropFrame.width) / 2);
    const maxY = Math.max(0, (rendered.height - cropFrame.height) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!rendered) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset(clampOffset({ x: drag.ox + e.clientX - drag.x, y: drag.oy + e.clientY - drag.y }));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom((value) => Math.min(4, Math.max(1, Number((value + delta).toFixed(2)))));
  }

  async function apply() {
    if (!image || !rendered) return;
    setApplying(true);
    setError(null);

    try {
      const outWidth = 1600;
      const outHeight = Math.max(400, Math.round(outWidth / cropRatio));
      const canvas = document.createElement('canvas');
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas недоступен');

      const exportScale = Math.max(outWidth / image.width, outHeight / image.height) * zoom;
      const exportWidth = image.width * exportScale;
      const exportHeight = image.height * exportScale;
      const exportOffsetScaleX = outWidth / cropFrame.width;
      const exportOffsetScaleY = outHeight / cropFrame.height;
      const x = (outWidth - exportWidth) / 2 + offset.x * exportOffsetScaleX;
      const y = (outHeight - exportHeight) / 2 + offset.y * exportOffsetScaleY;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const img = new window.Image();
      img.src = image.url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Не удалось подготовить изображение'));
      });
      ctx.drawImage(img, x, y, exportWidth, exportHeight);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9));
      if (!blob) throw new Error('Не удалось создать новый файл');
      const file = new File([blob], `image-${Date.now()}.webp`, { type: 'image/webp' });
      onApply(file, URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить обрезку');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col border border-white/15 bg-[#171716] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <p className="eyebrow">редактор изображения</p>
            <h2 className="mt-1 text-lg text-white">{title}</h2>
          </div>
          <button type="button" onClick={onCancel} className="text-3xl leading-none text-white/55 hover:text-white" aria-label="Закрыть">×</button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-auto p-5 lg:grid-cols-[minmax(0,1fr),280px] sm:p-6">
          <div
            ref={frameRef}
            className="relative min-h-[360px] overflow-hidden border border-white/10 bg-black touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            {!image && <div className="flex h-full min-h-[360px] items-center justify-center text-sm text-white/55">Загружаем изображение…</div>}
            {image && rendered && (
              <>
                <img
                  src={image.url}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{
                    width: rendered.width,
                    height: rendered.height,
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-black/55" />
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 border border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,.25)]"
                  style={{ width: cropFrame.width, height: cropFrame.height, transform: 'translate(-50%, -50%)' }}
                />
              </>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <p className="eyebrow">формат кадра</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {IMAGE_RATIOS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { setRatio(item.value); setOffset({ x: 0, y: 0 }); }}
                    className={`border px-3 py-2 text-xs transition-colors ${ratio === item.value ? 'border-white bg-white text-black' : 'border-white/15 text-white/70 hover:border-white/40 hover:text-white'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between"><p className="eyebrow">масштаб</p><span className="text-xs text-white/65">{Math.round(zoom * 100)}%</span></div>
              <input aria-label="Масштаб" className="mt-4 w-full" type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => { setZoom(Number(e.target.value)); setOffset(clampOffset(offset)); }} />
            </div>

            <p className="text-xs leading-5 text-white/60">Перетаскивайте фотографию внутри рамки. Колёсиком или ползунком меняйте масштаб.</p>
            {error && <p role="alert" className="text-xs leading-5 text-red-300">{error}</p>}

            <div className="mt-auto grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <button type="button" onClick={onCancel} className="border border-white/15 px-4 py-3 text-xs uppercase tracking-[0.12em] text-white/75 hover:text-white">Отмена</button>
              <button type="button" onClick={apply} disabled={applying || !image} className="bg-white px-4 py-3 text-xs uppercase tracking-[0.12em] text-black disabled:opacity-50">{applying ? 'Подготавливаем…' : 'Применить обрезку'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
