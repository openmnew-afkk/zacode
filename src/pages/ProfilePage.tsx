import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import type { Movie } from '../types';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, closeApp } = useTelegram();
  const { favorites, watchHistory, clearHistory } = useStore();

  const showCloseModal = false;

  const displayName = user ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : 'Гость';
  const username = user?.username ? `@${user.username}` : '';

  return (
    <div className="profile-page page">
      {/* Шапка */}
      <div className="profile-header">
        <div className="profile-avatar">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" className="profile-avatar__img" />
          ) : (
            <div className="profile-avatar__placeholder">{displayName[0]?.toUpperCase() || '?'}</div>
          )}
        </div>
        <h1 className="profile-name">{displayName}</h1>
        {username && <p className="profile-username">{username}</p>}
      </div>

      {/* Статистика */}
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat__value">{watchHistory.length}</span>
          <span className="profile-stat__label">Просмотрено</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__value">{favorites.length}</span>
          <span className="profile-stat__label">В избранном</span>
        </div>
      </div>

      {/* Настройки */}
      <div className="profile-section">
        <h2 className="profile-section__title">Настройки</h2>

        <div className="profile-setting" onClick={() => navigate('/favorites')}>
          <span className="profile-setting__label">❤️ Избранное</span>
          <span className="profile-setting__value">{favorites.length}</span>
        </div>

        <div className="profile-setting" onClick={() => navigate('/search')}>
          <span className="profile-setting__label">🔍 Поиск</span>
          <span className="profile-setting__value">→</span>
        </div>
      </div>

      {/* История */}
      <div className="profile-section">
        <div className="profile-section__header">
          <h2 className="profile-section__title">История просмотров</h2>
          {watchHistory.length > 0 && (
            <button className="profile-clear" onClick={clearHistory}>Очистить</button>
          )}
        </div>
        {watchHistory.length > 0 ? (
          <div className="profile-history">
            {watchHistory.map((item) => (
              <div key={item.movie.imdbID} className="history-item" onClick={() => navigate(`/movie/${item.movie.imdbID}`)}>
                <img
                  className="history-item__poster"
                  src={item.movie.poster_path || 'https://via.placeholder.com/80x120?text=?'}
                  alt={item.movie.title}
                />
                <div className="history-item__info">
                  <p className="history-item__title">{item.movie.title}</p>
                  <p className="history-item__date">{new Date(item.watchedAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <span className="history-item__arrow">›</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="profile-empty">Вы ещё ничего не смотрели</p>
        )}
      </div>

      {/* Кнопка закрытия */}
      <div className="profile-close-wrap">
        <button className="profile-close" onClick={closeApp}>Закрыть приложение</button>
      </div>
    </div>
  );
};

export default ProfilePage;