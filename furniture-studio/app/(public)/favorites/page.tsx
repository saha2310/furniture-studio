import type { Metadata } from 'next';
import { getPublishedWorks } from '@/lib/queries/works';
import { FavoritesContent } from '@/components/favorites/FavoritesContent';
import { FavoritesCount } from '@/components/favorites/FavoritesCount';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Избранные работы',
  description: 'Сохранённые работы мебельной мастерской.',
};

export default async function FavoritesPage() {
  const works = await getPublishedWorks();

  return (
    <div className="pt-[82px]">
      <section className="container-studio border-b border-white/10 py-20 lg:py-28">
        <p className="eyebrow">сохранённое</p>
        <h1 className="display-title mt-6">Избранные работы</h1>
        <p className="mt-8 max-w-[40rem] text-[15px] leading-7 text-espresso">
          Понравившиеся проекты, сохранённые на этом устройстве.
        </p>
        <FavoritesCount />
      </section>
      <section className="container-studio py-12 lg:py-16">
        <FavoritesContent works={works} />
      </section>
    </div>
  );
}
