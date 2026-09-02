import Image from 'next/image';
import Link from 'next/link';
import type { WorkWithUrls } from '@/types/domain';

export function WorkCard({ work, priority = false }: { work: WorkWithUrls; priority?: boolean }) {
  return (
    <Link href={`/works/${work.slug}`} className="group block border border-white/10 bg-[#1a1a18]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#252420]">
        {work.coverImage ? (
          <Image
            src={work.coverImage.url}
            alt={work.coverImage.alt_text || work.title}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone">Нет фото</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80" />
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-stone">
          <span>{String(work.sort_order + 1).padStart(2, '0')}</span>
          <span className="h-px flex-1 bg-white/10" />
          <span>{work.category?.name}</span>
        </div>
        <div className="mt-8 flex items-end justify-between gap-5">
          <div>
            <h3 className="text-[19px] tracking-[-0.02em]">{work.title}</h3>
            {Object.values(work.specs ?? {})[0] && (
              <p className="mt-2 text-[12px] text-stone">{Object.values(work.specs ?? {})[0]}</p>
            )}
          </div>
          <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-stone transition-transform duration-500 group-hover:translate-x-1 group-hover:text-white">
            Смотреть →
          </span>
        </div>
      </div>
    </Link>
  );
}
