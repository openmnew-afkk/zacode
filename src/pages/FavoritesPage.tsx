import React from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { MovieCard } from '../components/MovieCard';

export const FavoritesPage: React.FC = () => {
  const { favorites, clearHistory } = useStore();

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-lg border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Heart className="w-8 h-8 fill-red-500 text-red-500" />
            Избранное
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Heart className="w-16 h-16 text-gray-600" />
            <p className="text-xl text-gray-400">Избранное пусто</p>
            <p className="text-gray-500 text-center max-w-md">
              Добавляйте фильмы и сериалы в избранное, нажимая на иконку сердечка
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {favorites.map((movie) => (
                <MovieCard key={movie.imdbID} movie={movie} compact />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
