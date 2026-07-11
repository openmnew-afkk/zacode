import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MovieCard } from './MovieCard';
import type { Movie } from '../types';

interface MovieGridProps {
  movies: Movie[];
  title?: string;
  loading?: boolean;
}

export const MovieGrid: React.FC<MovieGridProps> = ({
  movies,
  title,
  loading = false,
}) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const scrollAmount = 300;
    const newPosition =
      direction === 'left'
        ? scrollPosition - scrollAmount
        : scrollPosition + scrollAmount;
    containerRef.current.scrollLeft = newPosition;
    setScrollPosition(newPosition);
  };

  if (loading) {
    return (
      <div className="w-full">
        {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-lg glass animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="w-full text-center py-12">
        <p className="text-gray-400">Ничего не найдено</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
      <div className="relative">
        <div
          ref={containerRef}
          className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide"
        >
          {movies.map((movie) => (
            <div key={movie.imdbID} className="flex-shrink-0 w-32 sm:w-40">
              <MovieCard movie={movie} compact />
            </div>
          ))}
        </div>
        {scrollPosition > 0 && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 p-2 glass hover:bg-white/20 rounded-full z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {containerRef.current &&
          containerRef.current.scrollLeft <
            containerRef.current.scrollWidth -
              containerRef.current.clientWidth && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 p-2 glass hover:bg-white/20 rounded-full z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
      </div>
    </div>
  );
};
