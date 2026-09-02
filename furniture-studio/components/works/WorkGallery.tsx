'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { WorkImageWithUrl } from '@/types/domain';

export function WorkGallery({ images, title }: { images: WorkImageWithUrl[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (images.length === 0) return <div className="aspect-[4/3] bg-white/5" />;
  const active = images[activeIndex];

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden bg-[#25231f]">
        <Image src={active.url} alt={active.alt_text || title} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-px bg-white/10">
          {images.map((img, i) => (
            <button key={img.id} type="button" onClick={() => setActiveIndex(i)} aria-label={`Показать фото ${i + 1} из ${images.length}`} aria-current={i === activeIndex} className={`relative aspect-square overflow-hidden bg-[#1b1a18] transition-opacity ${i === activeIndex ? 'opacity-100' : 'opacity-45 hover:opacity-80'}`}>
              <Image src={img.url} alt="" fill sizes="15vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
