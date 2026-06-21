import React, { useRef } from 'react';
import MovieCard from './MovieCard';
import SkeletonCard from './SkeletonCard';
import type { Movie } from '../types';
import './MovieList.css';

/* ===== Горизонтальный список фильмов ===== */

interface MovieListProps {
  title: string;
  movies: Movie[];
  loading?: boolean;
}

const MovieList: React.FC<MovieListProps> = ({ title, movies, loading = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="movie-list">
      <h2 className="movie-list__title">{title}</h2>
      <div className="movie-list__scroll" ref={scrollRef}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={`sk-${i}`} />
            ))
          : movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
      </div>
    </section>
  );
};

export default MovieList;
