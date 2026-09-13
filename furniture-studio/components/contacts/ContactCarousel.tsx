'use client';

import { useEffect, useState } from 'react';

interface CarouselImage {
  url: string;
  alt: string;
}

// Ширина одного слайда и зазор между ними — в процентах от ширины
// контейнера. Слайд специально меньше 100%, поэтому по краям всегда видно
// срез соседних фото — сразу понятно, что кадров несколько (и сколько),
// а не только по точкам внизу.
const SLIDE_WIDTH = 84;
const GAP = 3;
const STEP = SLIDE_WIDTH + GAP;

/**
 * До 5 фото, смена каждые 5 секунд: горизонтальная лента (как в галерее
 * работы), а не кроссфейд — один непрерывный transform на всей ленте
 * анимируется куда плавнее, чем наложение нескольких полноэкранных фото
 * друг на друга (в кроссфейде рывки были заметны особенно на мобильных).
 * Бесконечный луп — как в WorkGallery: дублируем первый/последний кадр по
 * краям ленты и мгновенно (без transition) перескакиваем на настоящий кадр,
 * когда лента доезжает до клона — это незаметно глазу.
 */
export function ContactCarousel({ images }: { images: CarouselImage[] }) {
  const hasMultiple = images.length > 1;
  // Без "среза" соседей смысла нет — если фото всего одно, слайд занимает
  // всю ширину, иначе по краям был бы виден просвет фона.
  const slideWidth = hasMultiple ? SLIDE_WIDTH : 100;
  const [active, setActive] = useState(0);
  const [trackIndex, setTrackIndex] = useState(hasMultiple ? 1 : 0);
  const [transition, setTransition] = useState(true);

  useEffect(() => {
    if (!hasMultiple) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % images.length);
      setTrackIndex((i) => i + 1);
      setTransition(true);
    }, 5000);
    return () => clearInterval(id);
  }, [hasMultiple, images.length]);

  function handleTrackEnd() {
    if (!hasMultiple) return;
    if (trackIndex === images.length + 1) {
      setTransition(false);
      setTrackIndex(1);
    } else if (trackIndex === 0) {
      setTransition(false);
      setTrackIndex(images.length);
    }
  }

  if (images.length === 0) return null;

  const slides = hasMultiple ? [images[images.length - 1], ...images, images[0]] : images;
  // Смещаем ленту так, чтобы активный слайд был по центру — тогда с обеих
  // сторон остаётся одинаковый "срез" соседних кадров.
  const offset = -(trackIndex * STEP) + (100 - slideWidth) / 2;

  return (
    <div className="contact-carousel-root absolute inset-0 overflow-hidden">
      <div
        className="flex h-full"
        style={{ transform: `translateX(${offset}%)`, transition: transition ? 'transform 700ms cubic-bezier(.2,.7,.2,1)' : 'none' }}
        onTransitionEnd={handleTrackEnd}
      >
        {slides.map((image, index) => (
          <div key={`${image.url}-${index}`} className="h-full shrink-0" style={{ flexBasis: `${slideWidth}%`, marginRight: index === slides.length - 1 ? 0 : `${GAP}%` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>

      {hasMultiple && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {images.map((image, index) => (
            <span key={image.url} className={`h-[3px] rounded-full bg-white transition-all duration-500 ${index === active ? 'w-5 opacity-90' : 'w-[3px] opacity-40'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

