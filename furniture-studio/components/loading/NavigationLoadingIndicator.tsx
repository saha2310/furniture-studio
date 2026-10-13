'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { RouteLoadingCat } from './RouteLoadingCat';

// Сколько ждать после клика, прежде чем считать переход «подвисшим»
// и показать индикатор загрузки.
const SHOW_DELAY_MS = 500;

// Если индикатор всё же показался, держим его минимум столько — иначе
// при переходе, который завершился сразу после порога в 500мс,
// получится неприятная вспышка на один кадр.
const MIN_VISIBLE_MS = 450;

// Предохранитель: если по какой-то причине переход не случится вовсе
// (например, ссылка вела на несуществующий маршрут или что-то пошло не
// так), не даём индикатору висеть вечно.
const SAFETY_TIMEOUT_MS = 15000;

function isInternalNavigableAnchor(anchor: HTMLAnchorElement): string | null {
  if (anchor.hasAttribute('data-no-loading-feedback')) return null;
  if (anchor.target && anchor.target !== '_self') return null;
  if (anchor.hasAttribute('download')) return null;

  const href = anchor.getAttribute('href');
  if (!href) return null;
  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return null;

  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function NavigationLoadingIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAt = useRef<number | null>(null);
  const pendingTarget = useRef<string | null>(null);

  useEffect(() => {
    // Реальная смена маршрута — самый надёжный сигнал «переход состоялся».
    // Прячем индикатор (если он был показан) и сбрасываем ожидание.
    pendingTarget.current = null;

    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (safetyTimer.current) {
      clearTimeout(safetyTimer.current);
      safetyTimer.current = null;
    }

    if (shownAt.current !== null) {
      const elapsed = Date.now() - shownAt.current;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        setVisible(false);
        shownAt.current = null;
      }, wait);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor) return;

      const destination = isInternalNavigableAnchor(anchor);
      if (!destination) return;

      const current = window.location.pathname + window.location.search + window.location.hash;
      if (destination === current) return; // ссылка ведёт туда же, где мы уже находимся

      pendingTarget.current = destination;

      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);

      showTimer.current = setTimeout(() => {
        // Клик мог быть отменён более новым кликом за это время.
        if (pendingTarget.current !== destination) return;

        setVisible(true);
        shownAt.current = Date.now();

        safetyTimer.current = setTimeout(() => {
          setVisible(false);
          shownAt.current = null;
          pendingTarget.current = null;
        }, SAFETY_TIMEOUT_MS);
      }, SHOW_DELAY_MS);
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return <RouteLoadingCat visible={visible} />;
}
