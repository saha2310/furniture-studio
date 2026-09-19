import type { Metadata } from 'next';
import { getPublishedWorksPageGrouped, getTopLevelCategoriesWithChildren, getAvailableColors } from '@/lib/queries/works';
import { WorksGrid } from '@/components/works/WorksGrid';
import { CategoryFilter } from '@/components/works/CategoryFilter';
import { ColorFilter } from '@/components/works/ColorFilter';

export const metadata: Metadata = {
  title: 'Работы',
  description: 'Диваны и кресла ручной работы — реальные проекты мастерской.',
};

export default async function WorksPage({ searchParams }: { searchParams: { category?: string; color?: string; page?: string } }) {
  const categorySlug = searchParams.category;
  const colorHex = searchParams.color;
  const requestedPage = Number.parseInt(searchParams.page ?? '1', 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [{ works, total, hasMore }, categories, colors] = await Promise.all([
    getPublishedWorksPageGrouped(categorySlug, colorHex, page, 8),
    getTopLevelCategoriesWithChildren(),
    getAvailableColors(categorySlug),
  ]);

  const nextParams = new URLSearchParams();
  nextParams.set('page', String(page + 1));
  if (categorySlug) nextParams.set('category', categorySlug);
  if (colorHex) nextParams.set('color', colorHex);
  const nextHref = hasMore ? `/works?${nextParams.toString()}` : undefined;

  const prevParams = new URLSearchParams();
  if (page > 1) prevParams.set('page', String(page - 1));
  if (categorySlug) prevParams.set('category', categorySlug);
  if (colorHex) prevParams.set('color', colorHex);
  const prevQuery = prevParams.toString();
  const prevHref = page > 1 ? (prevQuery ? `/works?${prevQuery}` : '/works') : undefined;

  return (
    <div className="pt-[82px]">
      <section className="container-studio border-b border-ink/10 pt-8 lg:pt-14 pb-10 lg:pb-12">
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="eyebrow flex items-center gap-4"><span className="h-px w-10 bg-ink/25" /> проекты</p>
            <h1 className="display-title mt-6">Работы</h1>
            <p className="mt-8 max-w-[40rem] text-[15px] leading-7 text-espresso">
              Диваны и кресла, изготовленные на заказ — под конкретное пространство клиента.
            </p>
          </div>
          <div className="hidden items-center gap-4 pb-2 text-[11px] uppercase tracking-[0.12em] text-stone md:flex">
            <span>{String((page - 1) * 8 + 1).padStart(2, '0')}</span><span className="h-px w-12 bg-ink/20" /><span>{String(total).padStart(2, '0')}</span>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <CategoryFilter categories={categories} activeSlug={categorySlug} activeColorHex={colorHex} />
          {colors.length > 1 && <span className="hidden h-8 w-px shrink-0 bg-ink/10 sm:block" aria-hidden="true" />}
          <ColorFilter colors={colors} activeHex={colorHex} categorySlug={categorySlug} />
        </div>
      </section>
      <section className="container-studio pt-6 pb-12 lg:pt-8 lg:pb-16">
        <WorksGrid works={works} nextHref={nextHref} prevHref={prevHref} />
      </section>
    </div>
  );
}
