import type { Metadata } from 'next';
import { getPublishedWorks, getCategories } from '@/lib/queries/works';
import { WorksGrid } from '@/components/works/WorksGrid';
import { CategoryFilter } from '@/components/works/CategoryFilter';

export const metadata: Metadata = {
  title: 'Работы',
  description: 'Диваны и кресла ручной работы — реальные проекты мастерской.',
};

export default async function WorksPage({ searchParams }: { searchParams: { category?: string } }) {
  const categorySlug = searchParams.category;
  const [works, categories] = await Promise.all([getPublishedWorks(categorySlug), getCategories()]);

  return (
    <div className="pt-[82px]">
      <section className="container-studio border-b border-white/10 py-20 lg:py-28">
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="eyebrow flex items-center gap-4"><span className="h-px w-10 bg-white/25" /> проекты</p>
            <h1 className="display-title mt-6">Работы</h1>
            <p className="mt-8 max-w-[40rem] text-[15px] leading-7 text-espresso">
              Диваны и кресла, изготовленные на заказ — под конкретное пространство клиента.
            </p>
          </div>
          <div className="hidden items-center gap-4 pb-2 text-[11px] uppercase tracking-[0.12em] text-stone md:flex">
            <span>{String(1).padStart(2, '0')}</span><span className="h-px w-12 bg-white/20" /><span>{String(works.length).padStart(2, '0')}</span>
          </div>
        </div>
        <div className="mt-10"><CategoryFilter categories={categories} activeSlug={categorySlug} /></div>
      </section>
      <section className="container-studio py-12 lg:py-16">
        <WorksGrid works={works} />
      </section>
    </div>
  );
}
