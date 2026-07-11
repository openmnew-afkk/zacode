import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Movie } from '../types';

interface StoreState {
  favorites: Movie[];
  history: Movie[];
  addFavorite: (movie: Movie) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addToHistory: (movie: Movie) => void;
  clearHistory: () => void;
}

export const useStore = create<StoreState>(
  persist(
    (set, get) => ({
      favorites: [],
      history: [],
      
      addFavorite: (movie: Movie) => {
        set((state) => {
          if (state.favorites.some((m) => m.imdbID === movie.imdbID)) {
            return state;
          }
          return { favorites: [...state.favorites, movie] };
        });
      },
      
      removeFavorite: (id: string) => {
        set((state) => ({
          favorites: state.favorites.filter((m) => m.imdbID !== id),
        }));
      },
      
      isFavorite: (id: string) => {
        return get().favorites.some((m) => m.imdbID === id);
      },
      
      addToHistory: (movie: Movie) => {
        set((state) => {
          const filtered = state.history.filter((m) => m.imdbID !== movie.imdbID);
          return { history: [movie, ...filtered].slice(0, 50) };
        });
      },
      
      clearHistory: () => {
        set({ history: [] });
      },
    }),
    {
      name: 'telecinema-store',
    }
  )
);
