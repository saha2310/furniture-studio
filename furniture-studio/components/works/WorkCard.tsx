'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { WorkWithUrls } from '@/types/domain';

const CARD_DESCRIPTION_LIMIT = 105;

export function WorkCard({ work, priority = false }: { work: WorkWithUrls; priority?: boolean }) {
  const description = work.description ?? '';
  const preview = description.length > CARD_DESCRIPTION_LIMIT
    ? `${description.slice(0, CARD_DESCRIPTION_LIMIT).trimEnd()}…`
    : description;

  return (
    <article className="group border border-white/10 bg-[#1a1a18]">
      <Link href={`/works/${work.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#252420]">
          {work.coverImage ? <Image src={work.coverImage.url} alt={work.coverImage.alt_text || work.title} fill priority={priority} sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]" /> : <div className="flex h-full items-center justify-center text-sm text-white/45">Нет фото</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        </div>
      </Link>
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-white/50"><span>{String(work.sort_order + 1).padStart(2, '0')}</span><span className="h-px flex-1 bg-white/10" /><span>{work.category?.name}</span></div>
        <div className="mt-7 flex items-start justify-between gap-5">
          <div className="min-w-0">
            <Link href={`/works/${work.slug}`} className="text-[19px] tracking-[-0.02em] text-white hover:text-white/80">{work.title}</Link>
            {work.price && <p className="mt-2 text-[12px] text-white/90">{work.price}</p>}
            {description && (
              <p className="mt-3 h-[3.75rem] max-w-[34ch] overflow-hidden break-words text-[12px] leading-5 text-white/72 [overflow-wrap:anywhere]">
                {preview}
              </p>
            )}
          </div>
          <Link href={`/works/${work.slug}`} className="shrink-0 pt-1 text-[11px] uppercase tracking-[0.12em] text-white/65 transition-transform duration-500 group-hover:translate-x-1 group-hover:text-white">Смотреть →</Link>
        </div>
      </div>
    </article>
  );
}
