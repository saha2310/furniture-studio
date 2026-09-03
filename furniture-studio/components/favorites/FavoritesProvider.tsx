'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'favoriteWorkIds';

type FavoritesContextValue = {
  favoriteIds: string[];
  ready: boolean;
  count: number;
  isFavorite: (workId: string) => boolean;
  toggleFavorite: (workId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function readStoredIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id): id is string => typeof id === 'string'))];
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

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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
    setFavoriteIds((current) =>
      current.includes(workId)
        ? current.filter((id) => id !== workId)
        : [...current, workId],
    );
  }, []);

  const value = useMemo<FavoritesContextValue>(() => ({
    favoriteIds,
    ready,
    count: favoriteIds.length,
    isFavorite: (workId: string) => favoriteIds.includes(workId),
    toggleFavorite,
  }), [favoriteIds, ready, toggleFavorite]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used inside FavoritesProvider');
  return context;
}
