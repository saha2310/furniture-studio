'use client';

import { useEffect, useState } from 'react';

interface CarouselImage {
  url: string;
  alt: string;
}

/**
 * До 5 фото, смена каждые 5 секунд: кроссфейд + медленный наплыв (масштаб
 * 1 → 1.08 на активном кадре — классический Ken Burns). При
 * prefers-reduced-motion длительности анимаций глушатся глобально (см.
 * app/globals.css), кадры просто мгновенно сменяются — сама смена по
 * таймеру не отключается, это не мигание, а смена контента раз в 5 секунд.
 */
export function ContactCarousel({ images }: { images: CarouselImage[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(() => setActive((i) => (i + 1) % images.length), 5000);
    return () => clearInterval(id);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="contact-carousel-root absolute inset-0">
      {images.map((image, index) => (
        <div key={image.url} className={`contact-carousel-slide absolute inset-0 ${index === active ? 'is-active' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
        </div>
      ))}
      {images.length > 1 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {images.map((image, index) => (
            <span key={image.url} className={`h-[3px] rounded-full bg-white transition-all duration-500 ${index === active ? 'w-5 opacity-90' : 'w-[3px] opacity-40'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
