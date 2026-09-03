'use client';

import { useFavorites } from './FavoritesProvider';

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
      <span aria-hidden="true" className="favorite-heart">{active ? '♥' : '♡'}</span>
    </button>
  );
}
