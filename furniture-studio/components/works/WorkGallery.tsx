'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { WorkImageWithUrl } from '@/types/domain';

export function WorkGallery({ images, title }: { images: WorkImageWithUrl[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [trackIndex, setTrackIndex] = useState(images.length > 1 ? 1 : 0);
  const [transition, setTransition] = useState(true);
  const [lightbox, setLightbox] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    setActiveIndex(0);
    setTrackIndex(images.length > 1 ? 1 : 0);
    setTransition(true);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [images]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowRight' && images.length > 1) next();
      if (e.key === 'ArrowLeft' && images.length > 1) prev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!lightbox) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [lightbox]);

  function next() {
    if (images.length < 2) return;
    setActiveIndex((value) => (value + 1) % images.length);
    setTrackIndex((value) => value + 1);
    setTransition(true);
  }

  function prev() {
    if (images.length < 2) return;
    setActiveIndex((value) => (value - 1 + images.length) % images.length);
    setTrackIndex((value) => value - 1);
    setTransition(true);
  }

  function handleTrackEnd() {
    if (images.length < 2) return;
    if (trackIndex === images.length + 1) {
      setTransition(false);
      setTrackIndex(1);
    } else if (trackIndex === 0) {
      setTransition(false);
      setTrackIndex(images.length);
    }
  }

  function openLightbox() {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setLightbox(true);
  }

  function zoomTo(nextScale: number) {
    const value = Math.max(1, Math.min(4, Number(nextScale.toFixed(2))));
    setScale(value);
    if (value === 1) setPosition({ x: 0, y: 0 });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (scale <= 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: position.x, oy: position.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    const current = drag.current;
    if (!current) return;
    setPosition({ x: current.ox + e.clientX - current.x, y: current.oy + e.clientY - current.y });
  }

  function onPointerUp() { drag.current = null; }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoomTo(scale + (e.deltaY > 0 ? -0.1 : 0.1));
  }

  if (images.length === 0) return <div className="aspect-[4/3] bg-white/5" />;

  const slides = images.length > 1 ? [images[images.length - 1], ...images, images[0]] : images;

  return (
    <div>
      <div className="group relative overflow-hidden bg-[#25231f]">
        <div className="relative aspect-[4/3] cursor-zoom-in overflow-hidden" onClick={openLightbox}>
          <div className="absolute inset-0 flex" style={{ transform: `translateX(-${trackIndex * 100}%)`, transition: transition ? 'transform 600ms cubic-bezier(.2,.7,.2,1)' : 'none' }} onTransitionEnd={handleTrackEnd}>
            {slides.map((img, index) => <div className="relative h-full w-full shrink-0 grow-0 basis-full" key={`${img.id}-${index}`}><Image src={img.url} alt={img.alt_text || title} fill priority={index === trackIndex} sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" /></div>)}
          </div>
        </div>
        {images.length > 1 && <><button type="button" aria-label="Предыдущее изображение" onClick={prev} className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/25 bg-black/30 text-white opacity-0 transition-opacity duration-300 hover:bg-black/50 group-hover:opacity-100">←</button><button type="button" aria-label="Следующее изображение" onClick={next} className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/25 bg-black/30 text-white opacity-0 transition-opacity duration-300 hover:bg-black/50 group-hover:opacity-100">→</button></>}
        <div className="absolute bottom-4 left-4 border border-white/15 bg-black/45 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/75">{String(activeIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</div>
      </div>

      {images.length > 1 && <div className="mt-3 grid grid-cols-5 gap-px bg-white/10 sm:grid-cols-6 md:grid-cols-8">{images.map((img, index) => <button type="button" key={img.id} onClick={() => { setActiveIndex(index); setTrackIndex(index + 1); setTransition(true); }} className={`relative aspect-square overflow-hidden bg-[#1b1a18] transition-opacity duration-300 ${index === activeIndex ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`} aria-label={`Открыть фотографию ${index + 1}`}><Image src={img.url} alt="" fill sizes="12vw" className="object-cover" /></button>)}</div>}

      {lightbox && <div className="fixed inset-0 z-[120] bg-black/96" role="dialog" aria-modal="true" aria-label={`Просмотр фотографий: ${title}`}>
        <button type="button" onClick={() => setLightbox(false)} aria-label="Закрыть" className="absolute right-5 top-5 z-30 text-4xl font-light text-white/70 hover:text-white">×</button>
        {images.length > 1 && <button type="button" onClick={prev} aria-label="Предыдущее фото" className="absolute left-4 top-1/2 z-30 -translate-y-1/2 text-3xl text-white/60 hover:text-white sm:left-7">←</button>}
        {images.length > 1 && <button type="button" onClick={next} aria-label="Следующее фото" className="absolute right-4 top-1/2 z-30 -translate-y-1/2 text-3xl text-white/60 hover:text-white sm:right-7">→</button>}
        <div className="flex h-full w-full items-center justify-center overflow-hidden p-6 sm:p-12" onDoubleClick={() => zoomTo(scale > 1 ? 1 : 2)} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <img src={images[activeIndex].url} alt={images[activeIndex].alt_text || title} draggable={false} className="max-h-full max-w-full select-none object-contain" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transition: drag.current ? 'none' : 'transform 180ms ease-out', cursor: scale > 1 ? 'grab' : 'zoom-in' }} />
        </div>
        <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 border border-white/15 bg-black/65 px-2 py-2 backdrop-blur">
          <button type="button" aria-label="Уменьшить" onClick={() => zoomTo(scale - 0.25)} className="h-9 w-9 text-lg text-white/80 hover:text-white">−</button>
          <input aria-label="Масштаб изображения" type="range" min="1" max="4" step="0.01" value={scale} onChange={(e) => zoomTo(Number(e.target.value))} className="w-32" />
          <button type="button" aria-label="Увеличить" onClick={() => zoomTo(scale + 0.25)} className="h-9 w-9 text-lg text-white/80 hover:text-white">+</button>
          <span className="min-w-12 text-center text-[10px] text-white/65">{Math.round(scale * 100)}%</span>
        </div>
      </div>}
    </div>
  );
}
