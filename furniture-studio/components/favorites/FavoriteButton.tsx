'use client';

import { useFavorites } from './FavoritesProvider';
import { NavigationIcon } from '@/components/icons/NavigationIcons';

export function FavoriteButton({
  workId,
  className = '',
  size = 'md',
}: {
  workId: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const { isFavorite, toggleFavorite, ready } = useFavorites();
  const active = isFavorite(workId);
  const label = active ? 'Удалить из избранного' : 'Добавить в избранное';

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={!ready}
      onClick={() => toggleFavorite(workId)}
      className={`liquid-glass-icon-button ${size === 'sm' ? 'liquid-glass-icon-button-sm' : ''} ${active ? 'is-favorite' : ''} ${className}`}
    >
      <NavigationIcon name="favorites" active={active} className={size === 'sm' ? 'h-[18px] w-[18px]' : 'h-5 w-5'} />
    </button>
  );
}
