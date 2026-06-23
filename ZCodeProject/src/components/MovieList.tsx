import React from 'react';
import MovieCard from './MovieCard';
import SkeletonCard from './SkeletonCard';
import type { Movie } from '../types';
import './MovieList.css';

/* ===== ULTRA PREMIUM Горизонтальный список фильмов ===== */

interface MovieListProps {
  title: string;
  movies: Movie[];
  loading?: boolean;
}

const MovieList: React.FC<MovieListProps> = ({ title, movies, loading = false }) => {
  return (
    <section className="movie-list">
      <div className="movie-list__header">
        <h2 className="movie-list__title">{title}</h2>
        <button className="movie-list__see-all">Все →</button>
      </div>
      <div className="movie-list__scroll-wrap">
        <div className="movie-list__scroll">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`sk-${i}`} />)
            : movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}
        </div>
      </div>
    </section>
  );
};

export default MovieList;
