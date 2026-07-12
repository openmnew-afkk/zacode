import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import './FavoritesPage.css';

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { favorites } = useStore();

  return (
    <div className="fav-page page">
      <div className="fav-header">
        <h1 className="fav-header__title">❤️ Избранное</h1>
        <p className="fav-header__sub">{favorites.length} {favorites.length === 1 ? 'фильм' : favorites.length < 5 ? 'фильма' : 'фильмов'}</p>
      </div>

      {favorites.length === 0 ? (
        <div className="fav-empty">
          <span className="fav-empty__icon">💔</span>
          <p className="fav-empty__title">Избранное пусто</p>
          <p className="fav-empty__sub">Добавляйте фильмы сердечком</p>
        </div>
      ) : (
        <div className="fav-grid">
          {favorites.map((movie) => (
            <div key={movie.imdbID} className="fav-card" onClick={() => navigate(`/movie/${movie.imdbID}`)}>
              <div className="fav-card__poster">
                <img src={movie.poster_path} alt={movie.title} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x300?text=?'; }} />
                {movie.imdb_rating > 0 && <span className="fav-card__rating">★ {movie.imdb_rating.toFixed(1)}</span>}
              </div>
              <p className="fav-card__title">{movie.title}</p>
              {movie.release_date && <p className="fav-card__year">{movie.release_date.slice(0, 4)}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;