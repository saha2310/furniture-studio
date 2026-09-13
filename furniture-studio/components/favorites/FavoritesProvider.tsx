'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'favoriteWorkIds';

type FavoritesContextValue = {
  favoriteIds: string[];
  ready: boolean;
  count: number;
  isFavorite: (workId: string) => boolean;
  toggleFavorite: (workId: string) => void;
  reconcileFavorites: (validWorkIds: Iterable<string>) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readStoredIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed
      .filter((id) => typeof id === 'string' || typeof id === 'number')
      .map((id) => String(id))
      .filter(Boolean))];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFavoriteIds(readStoredIds());
    setReady(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setFavoriteIds(readStoredIds());
    };

    const syncFromStorage = () => setFavoriteIds(readStoredIds());
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', syncFromStorage);
    window.addEventListener('focus', syncFromStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', syncFromStorage);
      window.removeEventListener('focus', syncFromStorage);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteIds));
    } catch {
      // localStorage may be unavailable in privacy-restricted environments.
    }
  }, [favoriteIds, ready]);

  const toggleFavorite = useCallback((workId: string) => {
    if (!workId) return;
    setFavoriteIds((current) =>
      current.includes(workId)
        ? current.filter((id) => id !== workId)
        : [...current, workId],
    );
  }, []);

  const reconcileFavorites = useCallback((validWorkIds: Iterable<string>) => {
    const validIds = new Set(validWorkIds);
    setFavoriteIds((current) => {
      const next = current.filter((id) => validIds.has(id));
      return next.length === current.length ? current : next;
    });
  }, []);

  const value = useMemo<FavoritesContextValue>(() => ({
    favoriteIds,
    ready,
    count: favoriteIds.length,
    isFavorite: (workId: string) => favoriteIds.includes(workId),
    toggleFavorite,
    reconcileFavorites,
  }), [favoriteIds, ready, toggleFavorite, reconcileFavorites]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used inside FavoritesProvider');
  return context;
}
