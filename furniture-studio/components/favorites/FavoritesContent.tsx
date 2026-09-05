'use client';

import Link from 'next/link';
import type { WorkWithUrls } from '@/types/domain';
import { WorkCard } from '@/components/works/WorkCard';
import { NavigationIcon } from '@/components/icons/NavigationIcons';
import { useFavorites } from './FavoritesProvider';
import { useEffect } from 'react';

export function FavoritesContent({ works }: { works: WorkWithUrls[] }) {
  const { favoriteIds, ready, reconcileFavorites } = useFavorites();
  const availableWorkIds = works.map((work) => work.id);

  useEffect(() => {
    if (!ready) return;
    reconcileFavorites(availableWorkIds);
  }, [ready, reconcileFavorites, availableWorkIds.join('|')]);

  const favorites = works.filter((work) => favoriteIds.includes(work.id));

  if (!ready) {
    return <p className="border-y border-ink/10 py-24 text-center text-sm text-stone">Загрузка избранного…</p>;
  }

  if (favorites.length === 0) {
    return (
      <div className="flex min-h-[34vh] flex-col items-center justify-center border-y border-ink/10 py-20 text-center">
        <NavigationIcon name="favorites" className="h-9 w-9 text-ink/70" />
        <h2 className="mt-5 text-2xl tracking-[-0.03em]">Здесь пока ничего нет</h2>
        <p className="mt-4 max-w-[34ch] text-sm leading-6 text-espresso">
          Сохраняйте понравившиеся работы, чтобы вернуться к ним позже.
        </p>
        <Link href="/works" className="reference-button mt-8">Посмотреть работы</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {favorites.map((work, i) => <WorkCard key={work.id} work={work} priority={i < 4} />)}
    </div>
  );
}
