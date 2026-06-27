import React from 'react';
import MovieCard from '../components/MovieCard';
import { useStore } from '../store/useStore';
import './FavoritesPage.css';

/* ===== ULTRA PREMIUM — Избранное ===== */

const FavoritesPage: React.FC = () => {
  const { favorites, clearFavorites } = useStore();

  return (
    <div className="favorites-page page">

      {/* Header */}
      <div className="favorites-header">
        <div className="favorites-header__left">
          <h1 className="favorites-header__title">Избранное</h1>
          {favorites.length > 0 && (
            <span className="favorites-header__count">{favorites.length} фильмов</span>
          )}
        </div>
        {favorites.length > 0 && (
          <button className="favorites-clear-btn" onClick={clearFavorites}>
            Очистить
          </button>
        )}
      </div>

      {/* Grid or empty */}
      {favorites.length > 0 ? (
        <div className="favorites-grid">
          {favorites.map((movie) => (
            <MovieCard key={movie.id} movie={movie} variant="grid" />
          ))}
        </div>
      ) : (
        <div className="favorites-empty">
          <div className="favorites-empty__aura" />
          <div className="favorites-empty__icon">💔</div>
          <h2 className="favorites-empty__title">Пока пусто</h2>
          <p className="favorites-empty__sub">
            Нажмите 🤍 на любом фильме,<br/>чтобы добавить его сюда
          </p>
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
