'use client';

import Link from 'next/link';
import { useFavorites } from './FavoritesProvider';
import { NavigationIcon } from '@/components/icons/NavigationIcons';

export function FavoriteHeaderButton() {
  const { count, ready } = useFavorites();

  return (
    <Link
      href="/favorites"
      aria-label={count ? `Избранные, ${count}` : 'Избранные'}
      className="liquid-glass-button favorite-header-button"
    >
      <NavigationIcon name="favorites" active={count > 0} className="h-4 w-4" />
      <span className="favorite-header-label">Избранные{ready && count > 0 ? ` ${count}` : ''}</span>
    </Link>
  );
}
