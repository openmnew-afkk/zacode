import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { Movie, WatchStatus } from '../types';
import './FavoritesPage.css';

const TABS: Array<{ id: WatchStatus | 'want'; label: string }> = [
  { id: 'want', label: 'В планах' },
  { id: 'watching', label: 'Смотрю' },
  { id: 'watched', label: 'Просмотрено' },
  { id: 'dropped', label: 'Брошено' },
];

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { favorites, tracked, setTrackedStatus, removeFavorite } = useStore();
  const [tab, setTab] = useState<WatchStatus | 'want'>('want');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const items: Movie[] =
    tab === 'want'
      ? favorites
      : Object.values(tracked)
          .filter((t) => t.status === tab)
          .sort((a, b) => b.addedAt - a.addedAt)
          .map((t) => t.movie);

  const allTracked = Object.values(tracked);
  const watchedCount = allTracked.filter((t) => t.status === 'watched').length;
  const watchingCount = allTracked.filter((t) => t.status === 'watching').length;

  const handleMarkWatched = (e: React.MouseEvent, movie: Movie) => {
    e.stopPropagation();
    setTrackedStatus(movie, 'watched');
    if (tab === 'want') {
      removeFavorite(movie.id);
    }
  };

  const handleSetStatus = (e: React.MouseEvent, movie: Movie, status: WatchStatus) => {
    e.stopPropagation();
    setTrackedStatus(movie, status);
    if (tab === 'want') {
      removeFavorite(movie.id);
    }
    setActiveMenuId(null);
  };

  const handleRemove = (e: React.MouseEvent, movieId: string) => {
    e.stopPropagation();
    if (tab === 'want') {
      removeFavorite(movieId);
    } else {
      const item = tracked[movieId];
      if (item) setTrackedStatus(item.movie, null);
    }
    setActiveMenuId(null);
  };

  return (
    <div className="fav-page page">
      {/* Header */}
      <div className="fav-header">
        <h1 className="fav-header__title">Списки</h1>
        <p className="fav-header__sub">Дневник просмотров и закладки</p>
      </div>

      {/* Summary stats */}
      <div className="fav-stats">
        <div className="fav-stat" onClick={() => setTab('watched')}>
          <span className="fav-stat__val">{watchedCount}</span>
          <span className="fav-stat__label">Просмотрено</span>
        </div>
        <div className="fav-stat-div" />
        <div className="fav-stat" onClick={() => setTab('watching')}>
          <span className="fav-stat__val">{watchingCount}</span>
          <span className="fav-stat__label">Смотрю сейчас</span>
        </div>
        <div className="fav-stat-div" />
        <div className="fav-stat" onClick={() => setTab('want')}>
          <span className="fav-stat__val">{favorites.length}</span>
          <span className="fav-stat__label">В планах</span>
        </div>
      </div>

      {/* Apple style Segmented Tabs */}
      <div className="fav-tabs-wrap">
        <div className="fav-tabs">
          {TABS.map((t) => {
            const count =
              t.id === 'want'
                ? favorites.length
                : Object.values(tracked).filter((x) => x.status === t.id).length;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                className={`fav-tab ${active ? 'active' : ''}`}
                onClick={() => {
                  setTab(t.id);
                  setActiveMenuId(null);
                }}
              >
                <span>{t.label}</span>
                {count > 0 && <span className="fav-tab__count">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="fav-empty">
          <div className="fav-empty__icon-box">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M5 3.5C5 2.67 5.67 2 6.5 2H17.5C18.33 2 19 2.67 19 3.5V22L12 18L5 22V3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="fav-empty__title">Список пуст</p>
          <p className="fav-empty__sub">Добавляйте фильмы в закладки или отмечайте просмотренное</p>
        </div>
      ) : (
        <div className="fav-grid">
          {items.map((movie) => {
            const tr = tracked[movie.id];
            const menuOpen = activeMenuId === movie.id;
            return (
              <div
                key={movie.id}
                className="fav-card"
                onClick={() => navigate(`/movie/${movie.id}`)}
              >
                <div className="fav-card__poster">
                  <img
                    src={movie.poster_path}
                    alt={movie.title}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x300?text=?';
                    }}
                  />
                  <div className="fav-card__veil" />
                  {movie.vote_average > 0 && (
                    <span className="fav-card__rating">★ {movie.vote_average.toFixed(1)}</span>
                  )}

                  {/* Fast action overlay button */}
                  <div className="fav-card__quick-bar">
                    {tab !== 'watched' && (
                      <button
                        className="fav-card__check-btn"
                        onClick={(e) => handleMarkWatched(e, movie)}
                        title="Отметить просмотренным"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Просмотрено</span>
                      </button>
                    )}
                    <button
                      className="fav-card__more-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(menuOpen ? null : movie.id);
                      }}
                      aria-label="Опции"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </div>

                  {/* Quick context dropdown */}
                  {menuOpen && (
                    <div className="fav-card__dropdown" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => handleSetStatus(e, movie, 'watched')}>
                        ✓ Просмотрено
                      </button>
                      <button onClick={(e) => handleSetStatus(e, movie, 'watching')}>
                        ▶ Смотрю сейчас
                      </button>
                      <button onClick={(e) => handleSetStatus(e, movie, 'want')}>
                        + В планы
                      </button>
                      <button className="danger" onClick={(e) => handleRemove(e, movie.id)}>
                        ✕ Удалить из списка
                      </button>
                    </div>
                  )}
                </div>

                <div className="fav-card__info">
                  <p className="fav-card__title">{movie.title}</p>
                  <p className="fav-card__meta">
                    {movie.release_date?.slice(0, 4)}
                    {movie.is_serial ? ' · сериал' : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
