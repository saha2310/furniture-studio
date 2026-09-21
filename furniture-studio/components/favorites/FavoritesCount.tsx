'use client';

import { useFavorites } from './FavoritesProvider';

export function FavoritesCount() {
  const { count, ready } = useFavorites();
  return (
    <p className="mt-5 text-[11px] uppercase tracking-[0.14em] text-stone" aria-live="polite">
      {ready ? `${count} ${count === 1 ? 'работа сохранена' : 'работ сохранено'}` : 'Загрузка сохранённого'}
    </p>
  );
}
