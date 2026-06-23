import React from 'react';
import MovieCard from '../components/MovieCard';
import { useStore } from '../store/useStore';
import './FavoritesPage.css';

/* ===== Страница избранного ===== */

const FavoritesPage: React.FC = () => {
  const { favorites } = useStore();

  return (
    <div className="favorites-page page">
      <h1 className="favorites-page__title">Избранное</h1>

      {favorites.length > 0 ? (
        <div className="favorites-grid">
          {favorites.map((movie) => (
            <MovieCard key={movie.id} movie={movie} variant="grid" />
          ))}
        </div>
      ) : (
        <div className="favorites-empty">
          <span className="favorites-empty__icon">💔</span>
          <h3>Нет избранных фильмов</h3>
          <p>Нажмите на сердечко, чтобы добавить фильм в избранное</p>
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
