'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { WorkImageWithUrl } from '@/types/domain';

export function WorkGallery({ images, title }: { images: WorkImageWithUrl[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [trackIndex, setTrackIndex] = useState(images.length > 1 ? 1 : 0);
  const [transition, setTransition] = useState(true);
  const [lightbox, setLightbox] = useState(false);
  const [lightboxImageReady, setLightboxImageReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);

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
      // Пока лайтбокс был открыт, next()/prev() двигали только activeIndex
      // (см. комментарий ниже), чтобы не анимировать скрытую фоновую карусель.
      // При закрытии — мгновенно, без transition, подставляем трек на нужный
      // кадр, иначе после закрытия под лайтбоксом окажется старое фото.
      setTransition(false);
      setTrackIndex(images.length > 1 ? activeIndex + 1 : 0);
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [lightbox]);

  function next() {
    if (images.length < 2) return;
    setActiveIndex((value) => (value + 1) % images.length);
    // Пока открыт лайтбокс, фоновая карусель всё равно скрыта под ним — не
    // гонять её transform-анимацию впустую (лишняя нагрузка = подлагивание).
    // Она сама подхватит нужный кадр без анимации, когда лайтбокс закроется.
    if (!lightbox) {
      setTrackIndex((value) => value + 1);
      setTransition(true);
    }
  }

  function prev() {
    if (images.length < 2) return;
    setActiveIndex((value) => (value - 1 + images.length) % images.length);
    if (!lightbox) {
      setTrackIndex((value) => value - 1);
      setTransition(true);
    }
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
    setLightboxImageReady(false);
    setLightbox(true);
  }

  function zoomTo(nextScale: number) {
    const value = Math.max(1, Math.min(4, Number(nextScale.toFixed(2))));
    setScale(value);
    if (value === 1) setPosition({ x: 0, y: 0 });
  }

  function getPointerDistance() {
    const values = Array.from(pointers.current.values());
    if (values.length < 2) return null;
    const dx = values[0].x - values[1].x;
    const dy = values[0].y - values[1].y;
    return Math.hypot(dx, dy);
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      const distance = getPointerDistance();
      if (distance) pinch.current = { distance, scale };
      drag.current = null;
      return;
    }
    if (scale <= 1) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: position.x, oy: position.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      const distance = getPointerDistance();
      if (distance && pinch.current) {
        zoomTo(pinch.current.scale * (distance / pinch.current.distance));
      }
      return;
    }
    const current = drag.current;
    if (!current || scale <= 1) return;
    setPosition({ x: current.ox + e.clientX - current.x, y: current.oy + e.clientY - current.y });
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    if (pointers.current.size === 1 && scale > 1) {
      const remaining = Array.from(pointers.current.values())[0];
      drag.current = { x: remaining.x, y: remaining.y, ox: position.x, oy: position.y };
    } else {
      drag.current = null;
    }
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    e.stopPropagation();
    zoomTo(scale + (e.deltaY > 0 ? -0.12 : 0.12));
  }

  if (images.length === 0) return <div className="aspect-[4/3] bg-ink/5" />;

  const slides = images.length > 1 ? [images[images.length - 1], ...images, images[0]] : images;

  return (
    <div>
      <div className="group relative min-w-0 overflow-hidden bg-surface">
        <div className="relative aspect-[4/3] cursor-zoom-in overflow-hidden lg:aspect-auto lg:h-[clamp(520px,48vw,760px)]" onClick={openLightbox}>
          <div className="absolute inset-0 flex" style={{ transform: `translateX(-${trackIndex * 100}%)`, transition: transition ? 'transform 600ms cubic-bezier(.2,.7,.2,1)' : 'none' }} onTransitionEnd={handleTrackEnd}>
            {slides.map((img, index) => <div className="relative h-full w-full shrink-0 grow-0 basis-full" key={`${img.id}-${index}`}><Image src={img.url} alt={img.alt_text || title} fill priority={index === trackIndex} sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" /></div>)}
          </div>
        </div>
        {images.length > 1 && <><button type="button" aria-label="Предыдущее изображение" onClick={prev} className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-ink/25 bg-black/30 text-ink opacity-0 transition-opacity duration-300 hover:bg-black/50 group-hover:opacity-100">←</button><button type="button" aria-label="Следующее изображение" onClick={next} className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-ink/25 bg-black/30 text-ink opacity-0 transition-opacity duration-300 hover:bg-black/50 group-hover:opacity-100">→</button></>}
        <div className="absolute bottom-4 left-4 border border-ink/15 bg-black/45 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-ink/75">{String(activeIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</div>
      </div>

      {images.length > 1 && <div className="mt-3 grid grid-cols-5 gap-px bg-ink/10 sm:grid-cols-6 md:grid-cols-8">{images.map((img, index) => <button type="button" key={img.id} onClick={() => { setActiveIndex(index); setTrackIndex(index + 1); setTransition(true); }} className={`relative aspect-square overflow-hidden bg-surface transition-opacity duration-300 ${index === activeIndex ? 'opacity-100' : 'opacity-40 hover:opacity-80'}`} aria-label={`Открыть фотографию ${index + 1}`}><Image src={img.url} alt="" fill sizes="12vw" className="object-cover" /></button>)}</div>}

      {lightbox && <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-[2px] transition-opacity duration-300" role="dialog" aria-modal="true" aria-label={`Просмотр фотографий: ${title}`}>
        <button type="button" onClick={() => setLightbox(false)} aria-label="Закрыть" className="absolute right-5 top-5 z-30 text-4xl font-light text-ink/70 hover:text-ink">×</button>
        {images.length > 1 && <button type="button" onClick={prev} aria-label="Предыдущее фото" className="absolute left-4 top-1/2 z-30 -translate-y-1/2 text-3xl text-ink/60 hover:text-ink sm:left-7">←</button>}
        {images.length > 1 && <button type="button" onClick={next} aria-label="Следующее фото" className="absolute right-4 top-1/2 z-30 -translate-y-1/2 text-3xl text-ink/60 hover:text-ink sm:right-7">→</button>}
        <div className="fixed inset-0 flex h-full w-full touch-none items-center justify-center overflow-hidden px-4 py-16 sm:px-8 sm:py-14" onDoubleClick={() => zoomTo(scale > 1 ? 1 : 2)} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <img src={images[activeIndex].url} alt={images[activeIndex].alt_text || title} draggable={false} onLoad={() => setLightboxImageReady(true)} className={`max-h-[calc(100vh-7rem)] max-w-[calc(100vw-2rem)] select-none object-contain transition-opacity duration-300 sm:max-h-[calc(100vh-6rem)] sm:max-w-[calc(100vw-4rem)] ${lightboxImageReady ? 'opacity-100' : 'opacity-0'}`} style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transition: drag.current ? 'none' : 'transform 180ms ease-out', cursor: scale > 1 ? 'grab' : 'zoom-in' }} />
        </div>
        <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 border border-ink/15 bg-black/65 px-2 py-2 backdrop-blur">
          <button type="button" aria-label="Уменьшить" onClick={() => zoomTo(scale - 0.25)} className="h-9 w-9 text-lg text-ink/80 hover:text-ink">−</button>
          <input aria-label="Масштаб изображения" type="range" min="1" max="4" step="0.01" value={scale} onChange={(e) => zoomTo(Number(e.target.value))} className="w-32" />
          <button type="button" aria-label="Увеличить" onClick={() => zoomTo(scale + 0.25)} className="h-9 w-9 text-lg text-ink/80 hover:text-ink">+</button>
          <span className="min-w-12 text-center text-[10px] text-ink/65">{Math.round(scale * 100)}%</span>
        </div>
      </div>}
    </div>
  );
}
