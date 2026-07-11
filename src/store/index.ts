import { create } from 'zustand';
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

const useLocalStorage = () => {
  return {
    getItem: (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // ignore
      }
    },
  };
};

export const useStore = create<StoreState>((set, get) => {
  const storage = useLocalStorage();
  
  const savedFavorites = storage.getItem('telecinema-favorites');
  const savedHistory = storage.getItem('telecinema-history');
  
  const initialFavorites: Movie[] = savedFavorites ? JSON.parse(savedFavorites) : [];
  const initialHistory: Movie[] = savedHistory ? JSON.parse(savedHistory) : [];
  
  return {
    favorites: initialFavorites,
    history: initialHistory,
    
    addFavorite: (movie: Movie) => {
      set((state) => {
        if (state.favorites.some((m) => m.imdbID === movie.imdbID)) {
          return state;
        }
        const newFavorites = [...state.favorites, movie];
        storage.setItem('telecinema-favorites', JSON.stringify(newFavorites));
        return { favorites: newFavorites };
      });
    },
    
    removeFavorite: (id: string) => {
      set((state) => {
        const newFavorites = state.favorites.filter((m) => m.imdbID !== id);
        storage.setItem('telecinema-favorites', JSON.stringify(newFavorites));
        return { favorites: newFavorites };
      });
    },
    
    isFavorite: (id: string) => {
      return get().favorites.some((m) => m.imdbID === id);
    },
    
    addToHistory: (movie: Movie) => {
      set((state) => {
        const filtered = state.history.filter((m) => m.imdbID !== movie.imdbID);
        const newHistory = [movie, ...filtered].slice(0, 50);
        storage.setItem('telecinema-history', JSON.stringify(newHistory));
        return { history: newHistory };
      });
    },
    
    clearHistory: () => {
      storage.setItem('telecinema-history', '[]');
      set({ history: [] });
    },
  };
});
