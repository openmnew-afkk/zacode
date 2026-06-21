import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { posterUrl } from '../api/tmdb';
import { useStore } from '../store/useStore';
import type { Movie } from '../types';
import './MovieCard.css';

/* ===== Карточка фильма ===== */

interface MovieCardProps {
  movie: Movie;
  variant?: 'default' | 'grid';
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, variant = 'default' }) => {
  const navigate = useNavigate();
  const { isFavorite, addFavorite, removeFavorite } = useStore();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const favorite = isFavorite(movie.id);

  const handleClick = () => {
    navigate(`/movie/${movie.id}`);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
    if (favorite) {
      removeFavorite(movie.id);
    } else {
      addFavorite(movie);
    }
  };

  return (
    <div
      className={`movie-card movie-card--${variant}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className="movie-card__poster-wrap">
        {!imgLoaded && <div className="movie-card__poster-skeleton skeleton-pulse" />}
        <img
          className={`movie-card__poster ${imgLoaded ? 'loaded' : ''}`}
          src={posterUrl(movie.poster_path)}
          alt={movie.title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/no-poster.svg';
            setImgLoaded(true);
          }}
        />
        <div className="movie-card__rating">
          <span className="movie-card__star">★</span>
          {movie.vote_average.toFixed(1)}
        </div>
        <button
          className={`movie-card__fav ${favorite ? 'active' : ''} ${heartAnim ? 'animate' : ''}`}
          onClick={handleFavorite}
          aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
        >
          {favorite ? '❤️' : '🤍'}
        </button>
      </div>
      <div className="movie-card__info">
        <p className="movie-card__title">{movie.title}</p>
        <p className="movie-card__year">
          {movie.release_date ? movie.release_date.slice(0, 4) : '—'}
        </p>
      </div>
    </div>
  );
};

export default MovieCard;
