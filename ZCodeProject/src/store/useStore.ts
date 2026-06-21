import { create } from 'zustand';
import type { Movie, WatchHistoryItem, AppTheme } from '../types';

/* ===== Zustand хранилище ===== */

interface AppState {
  // Избранное
  favorites: Movie[];
  addFavorite: (movie: Movie) => void;
  removeFavorite: (movieId: number) => void;
  isFavorite: (movieId: number) => boolean;

  // История просмотров
  watchHistory: WatchHistoryItem[];
  addToHistory: (movie: Movie) => void;
  clearHistory: () => void;

  // Тема
  theme: AppTheme;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
}

/** Загрузка данных из localStorage */
const loadFromStorage = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

/** Сохранение данных в localStorage */
const saveToStorage = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Ошибка сохранения в localStorage:', e);
  }
};

export const useStore = create<AppState>((set, get) => ({
  // ===== Избранное =====
  favorites: loadFromStorage<Movie[]>('tc_favorites', []),

  addFavorite: (movie: Movie) => {
    const updated = [...get().favorites, movie];
    saveToStorage('tc_favorites', updated);
    set({ favorites: updated });
  },

  removeFavorite: (movieId: number) => {
    const updated = get().favorites.filter((m) => m.id !== movieId);
    saveToStorage('tc_favorites', updated);
    set({ favorites: updated });
  },

  isFavorite: (movieId: number) => {
    return get().favorites.some((m) => m.id === movieId);
  },

  // ===== История =====
  watchHistory: loadFromStorage<WatchHistoryItem[]>('tc_history', []),

  addToHistory: (movie: Movie) => {
    const history = get().watchHistory.filter((h) => h.movie.id !== movie.id);
    const updated = [{ movie, watchedAt: Date.now() }, ...history].slice(0, 10);
    saveToStorage('tc_history', updated);
    set({ watchHistory: updated });
  },

  clearHistory: () => {
    saveToStorage('tc_history', []);
    set({ watchHistory: [] });
  },

  // ===== Тема =====
  theme: loadFromStorage<AppTheme>('tc_theme', 'dark'),

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    saveToStorage('tc_theme', newTheme);
    set({ theme: newTheme });
    document.documentElement.setAttribute('data-theme', newTheme);
  },

  setTheme: (theme: AppTheme) => {
    saveToStorage('tc_theme', theme);
    set({ theme });
    document.documentElement.setAttribute('data-theme', theme);
  },
}));
