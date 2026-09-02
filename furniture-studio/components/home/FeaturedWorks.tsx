import Link from 'next/link';
import type { WorkWithUrls } from '@/types/domain';
import { WorkCard } from '@/components/works/WorkCard';

export function FeaturedWorks({ works, title }: { works: WorkWithUrls[]; title?: string | null }) {
  if (works.length === 0) return null;

  return (
    <section className="border-t border-stone/70 bg-surface">
      <div className="container-studio py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-[20ch] text-[clamp(1.6rem,3vw,2.25rem)] leading-tight">
            {title || 'Избранные работы'}
          </h2>
          <Link href="/works" className="text-[15px] text-walnut underline-offset-4 hover:text-walnutDark hover:underline">
            Все работы
          </Link>
        </div>
        <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((work, i) => (
            <WorkCard key={work.id} work={work} priority={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
