import Image from 'next/image';
import Link from 'next/link';
import type { WorkWithUrls } from '@/types/domain';

export function WorkCard({ work, priority = false }: { work: WorkWithUrls; priority?: boolean }) {
  return (
    <Link href={`/works/${work.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded bg-surface">
        {work.coverImage ? (
          <Image
            src={work.coverImage.url}
            alt={work.coverImage.alt_text || work.title}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone">Нет фото</div>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[17px]">{work.title}</h3>
        <span className="shrink-0 text-sm text-stone">{work.category?.name}</span>
      </div>
    </Link>
  );
}
