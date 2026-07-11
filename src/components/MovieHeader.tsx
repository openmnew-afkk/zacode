import React from 'react';
import { Heart, Star } from 'lucide-react';
import { useStore } from '../store';
import type { MovieDetail } from '../types';

interface MovieHeaderProps {
  movie: MovieDetail;
}

export const MovieHeader: React.FC<MovieHeaderProps> = ({ movie }) => {
  const { isFavorite, addFavorite, removeFavorite } = useStore();
  const isLiked = isFavorite(movie.imdbID);

  const handleFavorite = () => {
    if (isLiked) {
      removeFavorite(movie.imdbID);
    } else {
      addFavorite(movie);
    }
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 h-96 overflow-hidden rounded-xl">
        <img
          src={movie.backdrop_path || movie.poster_path}
          alt={movie.title}
          className="w-full h-full object-cover blur-xl brightness-50"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = 'https://via.placeholder.com/1200x600';
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start pt-8 pb-8">
        <div className="hidden md:block">
          <img
            src={movie.poster_path}
            alt={movie.title}
            className="w-full rounded-lg shadow-2xl"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = 'https://via.placeholder.com/300x450?text=No+Poster';
            }}
          />
        </div>

        <div className="col-span-1 md:col-span-3 space-y-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">{movie.title}</h1>
            {movie.original_title && movie.original_title !== movie.title && (
              <p className="text-gray-300">{movie.original_title}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            {movie.imdb_rating > 0 && (
              <div className="flex items-center gap-2 glass px-3 py-2 rounded-lg">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{movie.imdb_rating.toFixed(1)}/10</span>
              </div>
            )}
            {movie.runtime && (
              <div className="glass px-3 py-2 rounded-lg text-sm">
                ⏱️ {movie.runtime} мин
              </div>
            )}
            {movie.release_date && (
              <div className="glass px-3 py-2 rounded-lg text-sm">
                📅 {movie.release_date}
              </div>
            )}
            <button
              onClick={handleFavorite}
              className="glass px-4 py-2 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <Heart
                className={`w-5 h-5 ${
                  isLiked ? 'fill-red-500 text-red-500' : 'text-white'
                }`}
              />
              <span>{isLiked ? 'В избранном' : 'В избранное'}</span>
            </button>
          </div>

          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {movie.genres.slice(0, 5).map((genre) => (
                <span
                  key={genre}
                  className="glass px-3 py-1 rounded-full text-sm"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {movie.plot && (
            <p className="text-gray-200 leading-relaxed max-w-2xl">
              {movie.plot}
            </p>
          )}

          {movie.directors.length > 0 && (
            <div>
              <p className="text-gray-400 text-sm">Режиссёр:</p>
              <p className="text-white">{movie.directors.join(', ')}</p>
            </div>
          )}

          {movie.actors.length > 0 && (
            <div>
              <p className="text-gray-400 text-sm">В ролях:</p>
              <p className="text-white">{movie.actors.slice(0, 3).join(', ')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
