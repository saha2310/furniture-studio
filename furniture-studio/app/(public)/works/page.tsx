import type { Metadata } from 'next';
import { getPublishedWorks, getCategories } from '@/lib/queries/works';
import { WorksGrid } from '@/components/works/WorksGrid';
import { CategoryFilter } from '@/components/works/CategoryFilter';

export const metadata: Metadata = {
  title: 'Работы',
  description: 'Диваны и кресла ручной работы — реальные проекты мастерской.',
};

export default async function WorksPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const categorySlug = searchParams.category;
  const [works, categories] = await Promise.all([
    getPublishedWorks(categorySlug),
    getCategories(),
  ]);

  return (
    <div className="container-studio py-14">
      <h1 className="text-[clamp(1.8rem,4vw,2.75rem)] leading-tight">Работы</h1>
      <p className="mt-3 max-w-prose text-espresso">
        Диваны и кресла, изготовленные на заказ — под конкретное пространство клиента.
      </p>

      <div className="mt-8">
        <CategoryFilter categories={categories} activeSlug={categorySlug} />
      </div>

      <div className="mt-10">
        <WorksGrid works={works} />
      </div>
    </div>
  );
}
