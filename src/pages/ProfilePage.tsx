import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import type { Movie } from '../types';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, closeApp, haptic, tg } = useTelegram();
  const {
    favorites, watchHistory, clearHistory, isPremium, premiumExpiry,
    theme, setTheme, role, telegramUsername,
  } = useStore();

  const displayName = user ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : 'Гость';
  const username = user?.username ? `@${user.username}` : (telegramUsername ? `@${telegramUsername}` : '');

  /* Остаток дней премиума */
  const daysLeft = premiumExpiry
    ? Math.max(1, Math.ceil((premiumExpiry - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  const isAdminUser = user?.username === 'MikySauce' || role === 'admin' || role === 'moderator';

  return (
    <div className="profile-page page">
      {/* ── Шапка профиля ── */}
      {isPremium ? (
        /* 👑 Премиум-профиль — золотая карточка */
        <div className="profile-header profile-header--premium">
          <div className="profile-premium-shine" />
          <div className="profile-avatar profile-avatar--premium">
            {user?.photo_url ? (
              <img src={user.photo_url} alt="" className="profile-avatar__img" />
            ) : (
              <div className="profile-avatar__placeholder">{displayName[0]?.toUpperCase() || '?'}</div>
            )}
          </div>
          <h1 className="profile-name profile-name--premium">{displayName}</h1>
          {username && <p className="profile-username">{username}</p>}
          <div className="profile-premium-badge profile-premium-badge--gold">
            ✨ PREMIUM{daysLeft ? ` · ${daysLeft} дн.` : ' · ♾️'}
          </div>
        </div>
      ) : (
        /* Обычный профиль — просто и аккуратно */
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
          <div className="profile-premium-badge">Базовый профиль</div>
        </div>
      )}

      {/* Статистика */}
      <div className="profile-stats">
        <div className="profile-stat" onClick={() => navigate('/favorites')}>
          <span className="profile-stat__value">{watchHistory.length}</span>
          <span className="profile-stat__label">Просмотрено</span>
        </div>
        <div className="profile-stat" onClick={() => navigate('/favorites')}>
          <span className="profile-stat__value">{favorites.length}</span>
          <span className="profile-stat__label">В избранном</span>
        </div>
        {isPremium && (
          <div className="profile-stat profile-stat--premium">
            <span className="profile-stat__value">👑</span>
            <span className="profile-stat__label">Премиум</span>
          </div>
        )}
      </div>

      {/* Настройки */}
      <div className="profile-section">
        <h2 className="profile-section__title">⚙️ Настройки</h2>

        {/* Тема */}
        <div
          className="profile-setting"
          onClick={() => { haptic('light'); setTheme(theme === 'dark' ? 'violet' : 'dark'); }}
        >
          <span className="profile-setting__label">
            {theme === 'dark' ? '🌙 Тёмная тема' : '💗 Розовая (для девочек)'}
          </span>
          <span className="profile-setting__value">→</span>
        </div>

        {/* Реклама управляется только из админ-панели */}
        <div className="profile-setting" onClick={() => navigate('/favorites')}>
          <span className="profile-setting__label">❤️ Избранное</span>
          <span className="profile-setting__value">{favorites.length}</span>
        </div>

        <div className="profile-setting" onClick={() => navigate('/search')}>
          <span className="profile-setting__label">🔍 Поиск</span>
          <span className="profile-setting__value">→</span>
        </div>

        <div
          className="profile-setting"
          onClick={() => navigate('/sport')}
          style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14 }}
        >
          <span className="profile-setting__label">⚽ СпортАнализ · прогнозы матчей</span>
          <span className="profile-setting__value">→</span>
        </div>

        <div
          className={`profile-setting ${isPremium ? 'profile-setting--premium' : ''}`}
          onClick={() => navigate('/premium')}
          style={isPremium ? undefined : { background: 'rgba(139,92,246,0.08)', borderRadius: 14 }}
        >
          <span className="profile-setting__label">
            {isPremium ? '👑 Мой Премиум' : '👑 Подключить Премиум'}
          </span>
          <span className="profile-setting__value">{isPremium ? '✓' : '→'}</span>
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
              <div key={item.movie.id} className="history-item" onClick={() => navigate(`/movie/${item.movie.id}`)}>
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

      {/* Админ/модератор */}
      {isAdminUser && (
        <div className="profile-section">
          <div
            className="profile-setting"
            onClick={() => navigate('/admin')}
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 14 }}
          >
            <span className="profile-setting__label">
              {role === 'moderator' && user?.username !== 'MikySauce' ? '🛡 Панель модератора' : '⚙️ Админ панель'}
            </span>
            <span className="profile-setting__value">→</span>
          </div>
        </div>
      )}

      {/* Кнопка закрытия — только внутри Telegram (в браузере она ничего не делает) */}
      {tg && (
        <div className="profile-close-wrap">
          <button className="profile-close" onClick={closeApp}>Закрыть приложение</button>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;