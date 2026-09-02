'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { WorkImageWithUrl } from '@/types/domain';

export function WorkGallery({ images, title }: { images: WorkImageWithUrl[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [scale, setScale] = useState(1);
  const active = images[activeIndex] ?? images[0];
  const next = () => setActiveIndex((i) => (i + 1) % images.length);
  const prev = () => setActiveIndex((i) => (i - 1 + images.length) % images.length);
  useEffect(() => { if (!lightbox) setScale(1); }, [lightbox]);
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(false); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); });
  if (images.length === 0) return <div className="aspect-[4/3] bg-white/5" />;

  return <div>
    <div className="group relative aspect-[4/3] overflow-hidden bg-[#25231f]">
      <Image src={active.url} alt={active.alt_text || title} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="cursor-zoom-in object-cover" onClick={() => setLightbox(true)} />
      {images.length > 1 && <><button type="button" onClick={prev} aria-label="Предыдущее изображение" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/20 bg-black/20 text-white opacity-0 transition-opacity group-hover:opacity-100">←</button><button type="button" onClick={next} aria-label="Следующее изображение" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/20 bg-black/20 text-white opacity-0 transition-opacity group-hover:opacity-100">→</button></>}
    </div>
    {images.length > 1 && <div className="mt-3 grid grid-cols-5 gap-px bg-white/10">{images.map((img, i) => <button key={img.id} type="button" onClick={() => setActiveIndex(i)} aria-label={`Показать фото ${i + 1} из ${images.length}`} className={`relative aspect-square overflow-hidden bg-[#1b1a18] transition-opacity ${i === activeIndex ? 'opacity-100' : 'opacity-45 hover:opacity-80'}`}><Image src={img.url} alt="" fill sizes="15vw" className="object-cover" /></button>)}</div>}
    {lightbox && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={`Просмотр изображения: ${title}`}>
      <button type="button" onClick={() => setLightbox(false)} aria-label="Закрыть" className="absolute right-5 top-5 z-10 text-3xl text-white/70 hover:text-white">×</button>
      {images.length > 1 && <button type="button" onClick={prev} className="absolute left-4 top-1/2 z-10 text-3xl text-white/60 hover:text-white">←</button>}
      <div className="relative h-[85vh] w-full max-w-6xl overflow-hidden"><img src={active.url} alt={active.alt_text || title} className="h-full w-full select-none object-contain transition-transform duration-300" style={{ transform: `scale(${scale})` }} /></div>
      {images.length > 1 && <button type="button" onClick={next} className="absolute right-4 top-1/2 z-10 text-3xl text-white/60 hover:text-white">→</button>}
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 border border-white/15 bg-black/50 p-1"><button type="button" onClick={() => setScale(v => Math.max(1, +(v - .25).toFixed(2)))} className="h-9 w-9 text-white">−</button><span className="min-w-12 text-center text-xs text-white/70">{Math.round(scale * 100)}%</span><button type="button" onClick={() => setScale(v => Math.min(4, +(v + .25).toFixed(2)))} className="h-9 w-9 text-white">+</button><input aria-label="Масштаб" type="range" min="1" max="4" step=".01" value={scale} onChange={e => setScale(Number(e.target.value))} className="w-28" /></div>
    </div>}
  </div>;
}
