'use client';

import { LoadingCatScene } from './LoadingCatScene';

// Показывается поверх всего сайта, только когда переход между страницами
// (клик по ссылке) занимает заметное время — см. NavigationLoadingIndicator.
export function RouteLoadingCat({ visible }: { visible: boolean }) {
  return (
    <div className={`route-loader ${visible ? 'is-visible' : ''}`} role="status" aria-live="polite" aria-hidden={!visible}>
      <LoadingCatScene />
    </div>
  );
}
