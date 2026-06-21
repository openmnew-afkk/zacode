import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store/useStore';
import { posterUrl } from '../api/tmdb';
import './ProfilePage.css';

/* ===== Страница профиля ===== */

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, closeApp } = useTelegram();
  const { favorites, watchHistory, theme, toggleTheme, clearHistory } = useStore();

  const displayName = user
    ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`
    : 'Гость';

  const username = user?.username ? `@${user.username}` : '';

  return (
    <div className="profile-page">
      {/* Профиль */}
      <div className="profile-header">
        <div className="profile-avatar">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="Аватар" className="profile-avatar__img" />
          ) : (
            <div className="profile-avatar__placeholder">
              {displayName[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>
        <h1 className="profile-name">{displayName}</h1>
        {username && <p className="profile-username">{username}</p>}
      </div>

      {/* Статистика */}
      <div className="profile-stats">
        <div className="profile-stat-card">
          <span className="profile-stat-card__value">{watchHistory.length}</span>
          <span className="profile-stat-card__label">Просмотрено</span>
        </div>
        <div className="profile-stat-card">
          <span className="profile-stat-card__value">{favorites.length}</span>
          <span className="profile-stat-card__label">В избранном</span>
        </div>
      </div>

      {/* История просмотров */}
      <div className="profile-section">
        <div className="profile-section__header">
          <h2 className="profile-section__title">История просмотров</h2>
          {watchHistory.length > 0 && (
            <button className="profile-section__clear" onClick={clearHistory}>
              Очистить
            </button>
          )}
        </div>
        {watchHistory.length > 0 ? (
          <div className="profile-history">
            {watchHistory.map((item) => (
              <div
                key={item.movie.id}
                className="history-item"
                onClick={() => navigate(`/movie/${item.movie.id}`)}
              >
                <img
                  className="history-item__poster"
                  src={posterUrl(item.movie.poster_path, 'w92')}
                  alt={item.movie.title}
                />
                <div className="history-item__info">
                  <p className="history-item__title">{item.movie.title}</p>
                  <p className="history-item__date">
                    {new Date(item.watchedAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="profile-section__empty">Вы ещё ничего не смотрели</p>
        )}
      </div>

      {/* Настройки */}
      <div className="profile-section">
        <h2 className="profile-section__title">Настройки</h2>
        <div className="profile-setting" onClick={toggleTheme}>
          <span className="profile-setting__label">
            {theme === 'dark' ? '🌙' : '☀️'} Тема
          </span>
          <span className="profile-setting__value">
            {theme === 'dark' ? 'Тёмная' : 'Светлая'}
          </span>
        </div>
      </div>

      {/* Выход */}
      <button className="profile-exit" onClick={closeApp}>
        Закрыть приложение
      </button>
    </div>
  );
};

export default ProfilePage;
