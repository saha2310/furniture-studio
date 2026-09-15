import Link from 'next/link';
import type { WorkWithVariants } from '@/types/domain';
import { WorkCard } from './WorkCard';

export function WorksGrid({
  works,
  nextHref,
  prevHref,
}: {
  works: WorkWithVariants[];
  nextHref?: string;
  prevHref?: string;
}) {
  if (works.length === 0) {
    return <p className="border-y border-ink/10 py-24 text-center text-sm text-stone">Пока нет опубликованных работ в этой категории.</p>;
  }

  return (
    <>
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {works.map((work, i) => (
          <WorkCard key={work.id} work={work} priority={i < 4} variant="journal" />
        ))}
      </div>
      {(prevHref || nextHref) && (
        <div className="mt-12 flex items-center justify-center gap-3">
          {prevHref && (
            <Link href={prevHref} className="reference-button" rel="prev">
              <span aria-hidden="true">←</span>
              Листать назад
            </Link>
          )}
          {nextHref && (
            <Link href={nextHref} className="reference-button" rel="next">
              Листать далее
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      )}
    </>
  );
}
