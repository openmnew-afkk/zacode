import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store/useStore';
import { posterUrl, getToken, setToken, checkSource } from '../api/catalog';
import './ProfilePage.css';

/* ===== Страница профиля ===== */

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, closeApp } = useTelegram();
  const { favorites, watchHistory, theme, toggleTheme, clearHistory } = useStore();

  // Состояние источника
  const [showSettings, setShowSettings] = useState(false);
  const [tokenInput, setTokenInput] = useState(getToken());
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'err'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const displayName = user
    ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`
    : 'Гость';

  const username = user?.username ? `@${user.username}` : '';

  const handleSaveToken = () => {
    setToken(tokenInput.trim());
    setStatusMsg('Токен сохранён. Проверьте соединение.');
    setStatus('idle');
  };

  const handleCheck = async () => {
    setStatus('checking');
    setStatusMsg('');
    const res = await checkSource();
    if (res.ok) {
      setStatus('ok');
      setStatusMsg(res.message);
    } else {
      setStatus('err');
      setStatusMsg(res.message);
    }
  };

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
                  src={posterUrl(item.movie.poster_path)}
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

        {/* Тема */}
        <div className="profile-setting" onClick={toggleTheme}>
          <span className="profile-setting__label">
            {theme === 'dark' ? '🌙 Тема' : '☀️ Тема'}
          </span>
          <span className="profile-setting__value">
            {theme === 'dark' ? 'Тёмная' : 'Светлая'}
          </span>
        </div>

        {/* Источники — раскрывающийся блок */}
        <div className="profile-setting" onClick={() => setShowSettings((v) => !v)}>
          <span className="profile-setting__label">🎬 Источники видео</span>
          <span className="profile-setting__value">
            {showSettings ? 'Скрыть ▲' : 'Настроить ▼'}
          </span>
        </div>

        {showSettings && (
          <div className="source-card">
            <div className="source-card__head">
              <span className="source-card__name">📡 VideoCDN</span>
              <span
                className={`source-card__badge source-card__badge--${
                  status === 'ok'
                    ? 'ok'
                    : status === 'err'
                    ? 'err'
                    : getToken()
                    ? 'ok'
                    : 'idle'
                }`}
              >
                {status === 'ok'
                  ? 'Онлайн'
                  : status === 'err'
                  ? 'Ошибка'
                  : getToken()
                  ? 'Задан'
                  : 'Нет токена'}
              </span>
            </div>

            <div className="source-card__field">
              <input
                className="source-card__input"
                type="text"
                placeholder="Вставьте токен VideoCDN"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="source-card__field">
              <button className="source-card__btn" onClick={handleSaveToken}>
                Сохранить
              </button>
              <button
                className="source-card__btn source-card__btn--ghost"
                onClick={handleCheck}
                disabled={status === 'checking'}
              >
                {status === 'checking' ? 'Проверка…' : 'Проверить'}
              </button>
            </div>

            {statusMsg && <p className="source-card__status">{statusMsg}</p>}

            <p className="source-card__hint">
              Токен хранится только на вашем устройстве. Если на сервере задана
              переменная окружения <code>VIDEOCDN_TOKEN</code>, токен здесь можно
              не вводить — он подставится автоматически.
            </p>
          </div>
        )}
      </div>

      {/* Выход */}
      <button className="profile-exit" onClick={closeApp}>
        Закрыть приложение
      </button>
    </div>
  );
};

export default ProfilePage;
