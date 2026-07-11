import React from 'react';
import { Heart, Star } from 'lucide-react';
import { useStore } from '../store';
import type { Movie } from '../types';
import { useNavigate } from 'react-router-dom';

interface MovieCardProps {
  movie: Movie;
  compact?: boolean;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, compact = false }) => {
  const navigate = useNavigate();
  const { isFavorite, addFavorite, removeFavorite } = useStore();
  const isLiked = isFavorite(movie.imdbID);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiked) {
      removeFavorite(movie.imdbID);
    } else {
      addFavorite(movie);
    }
  };

  if (compact) {
    return (
      <div
        onClick={() => navigate(`/movie/${movie.imdbID}`)}
        className="group relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer"
      >
        <img
          src={movie.poster_path}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = 'https://via.placeholder.com/300x450?text=No+Poster';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-2 right-2">
          <button
            onClick={handleFavorite}
            className="p-2 rounded-full glass hover:bg-white/20 transition-colors"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isLiked ? 'fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-sm font-semibold line-clamp-2">{movie.title}</p>
          {movie.imdb_rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-xs">{movie.imdb_rating}/10</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/movie/${movie.imdbID}`)}
      className="glass group cursor-pointer overflow-hidden hover:bg-white/20 transition-colors"
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={movie.poster_path}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = 'https://via.placeholder.com/300x450?text=No+Poster';
          }}
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold line-clamp-2">{movie.title}</h3>
        <p className="text-xs text-gray-400 mt-1">{movie.release_date}</p>
        <div className="flex items-center justify-between mt-3">
          {movie.imdb_rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm">{movie.imdb_rating.toFixed(1)}</span>
            </div>
          )}
          <button
            onClick={handleFavorite}
            className="p-2 hover:bg-white/20 rounded transition-colors"
          >
            <Heart
              className={`w-5 h-5 ${
                isLiked ? 'fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
