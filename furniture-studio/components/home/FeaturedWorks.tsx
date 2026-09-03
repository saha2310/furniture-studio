import Link from 'next/link';
import type { WorkWithUrls } from '@/types/domain';
import { WorkCard } from '@/components/works/WorkCard';

export function FeaturedWorks({ works, title }: { works: WorkWithUrls[]; title?: string | null }) {
  if (works.length === 0) return null;

  return (
    <section className="border-b border-white/10 bg-[#141413]">
      <div className="container-studio py-24 lg:py-28">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">избранное</p>
            <h2 className="display-title mt-5 max-w-[9ch]">{title || 'Проекты'}</h2>
          </div>
          <Link href="/works" className="group inline-flex items-center gap-5 pb-2 text-[11px] uppercase tracking-[0.14em] text-espresso hover:text-white">
            Все работы <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
        </div>
        <div className="mt-14 grid gap-px border-l border-t border-white/10 bg-white/10 lg:grid-cols-2 xl:grid-cols-4">
          {works.map((work, i) => <WorkCard key={work.id} work={work} priority={i === 0} />)}
        </div>
      </div>
    </section>
  );
}
