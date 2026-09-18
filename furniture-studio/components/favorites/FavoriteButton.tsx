'use client';

import { useRef } from 'react';
import { useFavorites } from './FavoritesProvider';
import { NavigationIcon } from '@/components/icons/NavigationIcons';

// Розовые частицы-искры в момент добавления в избранное — перенесено из
// референсов (code_artifact.html / code_artifact(3).html). Только на
// добавление, не на снятие: иначе на быстрый повторный клик частицы
// накладываются друг на друга без видимой причины.
function spawnFavoriteParticles(button: HTMLButtonElement) {
  // .liquid-glass-icon-button держит overflow:hidden (нужен для блика при
  // hover) — частицы внутри кнопки обрезались бы по кругу. Поэтому крепим их
  // к <body> с position:fixed и координатами из getBoundingClientRect,
  // а не как детей самой кнопки.
  const rect = button.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  const count = 10;

  for (let i = 0; i < count; i += 1) {
    const particle = document.createElement('span');
    particle.className = 'favorite-particle';

    const size = Math.random() * 6 + 4;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 50 + 25;

    particle.style.setProperty('--fp-size', `${size}px`);
    particle.style.setProperty('--fp-tx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--fp-ty', `${Math.sin(angle) * distance}px`);
    particle.style.left = `${originX}px`;
    particle.style.top = `${originY}px`;

    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 550);
  }
}

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
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handleClick() {
    const willBeFavorite = !active;
    toggleFavorite(workId);
    if (willBeFavorite && buttonRef.current) {
      spawnFavoriteParticles(buttonRef.current);
    }
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={!ready}
      onClick={handleClick}
      className={`liquid-glass-icon-button ${size === 'sm' ? 'liquid-glass-icon-button-sm' : ''} ${active ? 'is-favorite' : ''} ${className}`}
    >
      <NavigationIcon name="favorites" active={active} className={size === 'sm' ? 'h-[18px] w-[18px]' : 'h-5 w-5'} />
    </button>
  );
}
