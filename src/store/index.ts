/* ===== TeleCinema — Единый store ===== */

import { create } from 'zustand';
import type { Movie, WatchHistoryItem, AppTheme } from '../types';

/* ── localStorage helpers ── */

const load = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

/* ── State Interface ── */

interface AppState {
  /* Избранное */
  favorites: Movie[];
  addFavorite: (movie: Movie) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clearFavorites: () => void;

  /* История просмотров */
  watchHistory: WatchHistoryItem[];
  addToHistory: (movie: Movie) => void;
  clearHistory: () => void;

  /* Тема */
  theme: AppTheme;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
}

export const useStore = create<AppState>((set, get) => ({
  /* ═══ Избранное ═══ */
  favorites: load<Movie[]>('tc_favorites', []),

  addFavorite: (movie: Movie) => {
    const updated = [...get().favorites, movie];
    save('tc_favorites', updated);
    set({ favorites: updated });
  },

  removeFavorite: (id: string) => {
    const updated = get().favorites.filter((m) => m.imdbID !== id);
    save('tc_favorites', updated);
    set({ favorites: updated });
  },

  isFavorite: (id: string) => {
    return get().favorites.some((m) => m.imdbID === id);
  },

  clearFavorites: () => {
    save('tc_favorites', []);
    set({ favorites: [] });
  },

  /* ═══ История ═══ */
  watchHistory: load<WatchHistoryItem[]>('tc_history', []),

  addToHistory: (movie: Movie) => {
    const filtered = get().watchHistory.filter((h) => h.movie.imdbID !== movie.imdbID);
    const updated = [{ movie, watchedAt: Date.now() }, ...filtered].slice(0, 50);
    save('tc_history', updated);
    set({ watchHistory: updated });
  },

  clearHistory: () => {
    save('tc_history', []);
    set({ watchHistory: [] });
  },

  /* ═══ Тема ═══ */
  theme: load<AppTheme>('tc_theme', 'dark'),

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    save('tc_theme', newTheme);
    set({ theme: newTheme });
    document.documentElement.setAttribute('data-theme', newTheme);
  },

  setTheme: (theme: AppTheme) => {
    save('tc_theme', theme);
    set({ theme });
    document.documentElement.setAttribute('data-theme', theme);
  },
}));