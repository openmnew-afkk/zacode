import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { Movie, WatchStatus } from '../types';
import './FavoritesPage.css';

const TABS: Array<{ id: WatchStatus | 'want' | 'liked'; label: string }> = [
  { id: 'liked', label: 'Понравилось' },
  { id: 'want', label: 'В планах' },
  { id: 'watching', label: 'Смотрю' },
  { id: 'watched', label: 'Просмотрено' },
  { id: 'dropped', label: 'Брошено' },
];

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { favorites, tracked, setTrackedStatus, addFavorite, removeFavorite } = useStore();
  const [tab, setTab] = useState<WatchStatus | 'want' | 'liked'>('liked');
  const [centeredCard, setCenteredCard] = useState(0);

  const allTracked = Object.values(tracked);
  const wantMovies = allTracked
    .filter((item) => item.status === 'want')
    .sort((a, b) => b.addedAt - a.addedAt);

  const items: Movie[] = tab === 'liked'
    ? [...favorites].reverse()
    : tab === 'want'
      ? wantMovies.map((item) => item.movie)
      : allTracked
          .filter((item) => item.status === tab)
          .sort((a, b) => b.addedAt - a.addedAt)
          .map((item) => item.movie);

  const watchedCount = allTracked.filter((t) => t.status === 'watched').length;
  const watchingCount = allTracked.filter((t) => t.status === 'watching').length;

  const handleStatusChange = (movie: Movie, value: string) => {
    if (value === 'remove') {
      if (tab === 'liked') {
        removeFavorite(movie.id);
      } else if (tracked[movie.id]) {
        setTrackedStatus(movie, null);
      }
      return;
    }
    if (value === 'liked') {
      if (tab === 'liked') {
        return;
      } else if (!favorites.some((item) => item.id === movie.id)) {
        addFavorite(movie);
      }
      return;
    }
    if (value === 'want' || value === 'watching' || value === 'watched' || value === 'dropped') {
      setTrackedStatus(movie, value);
    }
  };

  const updateCenteredCard = (rail: HTMLDivElement) => {
    const center = rail.getBoundingClientRect().left + rail.clientWidth / 2;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    Array.from(rail.children).forEach((child, index) => {
      const rect = child.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    setCenteredCard(nearestIndex);
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
        <button className="fav-stat" type="button" onClick={() => setTab('watched')}>
          <span className="fav-stat__val">{watchedCount}</span>
          <span className="fav-stat__label">Просмотрено</span>
        </button>
        <div className="fav-stat-div" />
        <button className="fav-stat" type="button" onClick={() => setTab('watching')}>
          <span className="fav-stat__val">{watchingCount}</span>
          <span className="fav-stat__label">Смотрю сейчас</span>
        </button>
        <div className="fav-stat-div" />
        <button className="fav-stat" type="button" onClick={() => setTab('want')}>
          <span className="fav-stat__val">{wantMovies.length}</span>
          <span className="fav-stat__label">В планах</span>
        </button>
      </div>

      {/* Apple style Segmented Tabs */}
      <div className="fav-tabs-wrap">
        <div className="fav-tabs">
          {TABS.map((t) => {
            const count = t.id === 'liked'
              ? favorites.length
              : t.id === 'want'
                ? wantMovies.length
                : allTracked.filter((item) => item.status === t.id).length;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                className={`fav-tab ${active ? 'active' : ''}`}
                onClick={() => {
                  setTab(t.id);
                  setCenteredCard(0);
                }}
                aria-pressed={active}
              >
                <span>{t.label}</span>
                <span className="fav-tab__count">{count}</span>
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
          <p className="fav-empty__sub">
            {tab === 'liked'
              ? 'Отмечайте сердцем фильмы и сериалы, которые вам нравятся'
              : 'Добавляйте фильмы в закладки или отмечайте просмотренное'}
          </p>
        </div>
      ) : (
        <div className="fav-grid" onScroll={(event) => updateCenteredCard(event.currentTarget)}>
          {items.map((movie, index) => {
            return (
              <div
                key={movie.id}
                className={`fav-card ${centeredCard === index ? 'is-centered' : ''}`}
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

                </div>

                <div className="fav-card__info">
                  <p className="fav-card__title">{movie.title}</p>
                  <p className="fav-card__meta">
                    {movie.release_date?.slice(0, 4)}
                    {movie.is_serial ? ' · сериал' : ''}
                  </p>
                  <label className="fav-card__status">
                    <span aria-hidden="true">✦</span>
                    <select
                      value={tracked[movie.id]?.status ?? 'liked'}
                      aria-label={`Статус для «${movie.title}»`}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        event.stopPropagation();
                        handleStatusChange(movie, event.target.value);
                      }}
                    >
                      <option value="liked">{tab === 'liked' ? 'Понравилось' : 'В понравившееся'}</option>
                      <option value="want">В планах</option>
                      <option value="watching">Смотрю</option>
                      <option value="watched">Просмотрено</option>
                      <option value="dropped">Брошено</option>
                      <option value="remove">{tab === 'liked' ? 'Убрать из понравившегося' : 'Убрать из этого списка'}</option>
                    </select>
                    <span className="fav-card__status-chevron" aria-hidden="true">⌄</span>
                  </label>
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
