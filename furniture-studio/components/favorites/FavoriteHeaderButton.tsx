'use client';

import Link from 'next/link';
import { useFavorites } from './FavoritesProvider';

export function FavoriteHeaderButton() {
  const { count, ready } = useFavorites();

  return (
    <Link
      href="/favorites"
      aria-label={count ? `Избранные, ${count}` : 'Избранные'}
      className="liquid-glass-button favorite-header-button"
    >
      <span aria-hidden="true" className="favorite-heart">{count ? '♥' : '♡'}</span>
      <span className="favorite-header-label">Избранные{ready && count > 0 ? ` ${count}` : ''}</span>
    </Link>
  );
}
