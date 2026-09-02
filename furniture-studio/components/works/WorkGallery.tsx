'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { WorkImageWithUrl } from '@/types/domain';

export function WorkGallery({ images, title }: { images: WorkImageWithUrl[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return <div className="aspect-[4/3] rounded bg-surface" />;
  }

  const active = images[activeIndex];

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded bg-surface">
        <Image
          src={active.url}
          alt={active.alt_text || title}
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Показать фото ${i + 1} из ${images.length}`}
              aria-current={i === activeIndex}
              className={`relative aspect-square overflow-hidden rounded ${
                i === activeIndex ? 'ring-2 ring-ink' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={img.url} alt="" fill sizes="20vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
