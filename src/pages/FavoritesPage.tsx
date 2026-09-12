import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { WatchStatus } from '../types';
import './FavoritesPage.css';

const TABS: Array<{ id: WatchStatus | 'want'; label: string; icon: string }> = [
  { id: 'want', label: 'Буду смотреть', icon: '🔖' },
  { id: 'watching', label: 'Смотрю', icon: '▶️' },
  { id: 'watched', label: 'Просмотрено', icon: '✅' },
  { id: 'dropped', label: 'Брошено', icon: '🚫' },
];

const statusLabels: Record<WatchStatus, string> = {
  want: '🔖 Буду смотреть',
  watching: '▶️ Смотрю',
  watched: '✅ Посмотрел',
  dropped: '🚫 Брошено',
};

const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { favorites, tracked } = useStore();
  const [tab, setTab] = useState<WatchStatus | 'want'>('want');

  const items =
    tab === 'want'
      ? favorites
      : Object.values(tracked)
          .filter((t) => t.status === tab)
          .sort((a, b) => b.addedAt - a.addedAt)
          .map((t) => t.movie);

  /* Статистика дневника */
  const allTracked = Object.values(tracked);
  const ratedItems = allTracked.filter((t) => t.rating != null);
  const avgRating = ratedItems.length
    ? (ratedItems.reduce((sum, t) => sum + (t.rating ?? 0), 0) / ratedItems.length).toFixed(1)
    : null;

  return (
    <div className="fav-page page">
      <div className="fav-header">
        <h1 className="fav-header__title">🎬 Мои списки</h1>
        <p className="fav-header__sub">Дневник просмотренного</p>
      </div>

      {/* Статистика */}
      {allTracked.length > 0 && (
        <div className="fav-stats">
          <div className="fav-stat">
            <span className="fav-stat__val">{allTracked.filter((t) => t.status === 'watched').length}</span>
            <span className="fav-stat__label">Просмотрено</span>
          </div>
          <div className="fav-stat">
            <span className="fav-stat__val">{allTracked.filter((t) => t.status === 'watching').length}</span>
            <span className="fav-stat__label">Смотрю</span>
          </div>
          <div className="fav-stat">
            <span className="fav-stat__val">{avgRating ?? '—'}</span>
            <span className="fav-stat__label">Ср. оценка</span>
          </div>
        </div>
      )}

      {/* Вкладки */}
      <div className="fav-tabs">
        {TABS.map((t) => {
          const count = t.id === 'want'
            ? favorites.length
            : Object.values(tracked).filter((x) => x.status === t.id).length;
          return (
            <button
              key={t.id}
              className={`fav-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
              {count > 0 && <span className="fav-tab__count">{count}</span>}
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="fav-empty">
          <span className="fav-empty__icon">🍿</span>
          <p className="fav-empty__title">Пока пусто</p>
          <p className="fav-empty__sub">
            Отмечай фильмы на их странице — появятся здесь
          </p>
        </div>
      ) : (
        <div className="fav-grid">
          {items.map((movie) => {
            const tr = tracked[movie.id];
            return (
              <div key={movie.id} className="fav-card" onClick={() => navigate(`/movie/${movie.id}`)}>
                <div className="fav-card__poster">
                  <img src={movie.poster_path} alt={movie.title} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x300?text=?'; }} />
                  {movie.vote_average > 0 && <span className="fav-card__rating">★ {movie.vote_average.toFixed(1)}</span>}
                  {tr?.rating != null && <span className="fav-card__myrating">Моя ★ {tr.rating}</span>}
                </div>
                <p className="fav-card__title">{movie.title}</p>
                <p className="fav-card__meta">
                  {tr ? statusLabels[tr.status] : ''}{movie.release_date ? `${tr ? ' · ' : ''}${movie.release_date.slice(0, 4)}` : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
