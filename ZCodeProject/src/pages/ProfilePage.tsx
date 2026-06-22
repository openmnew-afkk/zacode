import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store/useStore';
import {
  posterUrl,
  getToken, setToken,
  getPlayerPattern, setPlayerPattern,
  checkSource,
} from '../api/catalog';
import './ProfilePage.css';

/* ===== Страница профиля с модальным подтверждением ===== */

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, closeApp } = useTelegram();
  const { favorites, watchHistory, theme, toggleTheme, clearHistory } = useStore();

  // Состояние источника (каталог)
  const [showSources, setShowSources] = useState(false);
  const [tokenInput, setTokenInput] = useState(getToken());
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'checking' | 'ok' | 'err'>('idle');
  const [tokenMsg, setTokenMsg] = useState('');

  // Состояние плеера (embed pattern)
  const [showPlayer, setShowPlayer] = useState(false);
  const [patternInput, setPatternInput] = useState(getPlayerPattern());
  const [patternMsg, setPatternMsg] = useState('');

  // Модалка закрытия
  const [showCloseModal, setShowCloseModal] = useState(false);

  const displayName = user
    ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`
    : 'Гость';
  const username = user?.username ? `@${user.username}` : '';

  /* ===== Токен каталога ===== */
  const handleSaveToken = () => {
    setToken(tokenInput.trim());
    setTokenMsg('Токен сохранён. Проверьте соединение.');
    setTokenStatus('idle');
  };

  const handleCheckToken = async () => {
    setTokenStatus('checking');
    setTokenMsg('');
    const res = await checkSource();
    setTokenStatus(res.ok ? 'ok' : 'err');
    setTokenMsg(res.message);
  };

  /* ===== Embed-паттерн плеера ===== */
  const handleSavePattern = () => {
    setPlayerPattern(patternInput.trim());
    setPatternMsg('Паттерн сохранён. {ID} подставится автоматически.');
    setTimeout(() => setPatternMsg(''), 4000);
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

        {/* Каталог (poiskkino.dev) */}
        <div className="profile-setting" onClick={() => setShowSources((v) => !v)}>
          <span className="profile-setting__label">📚 Каталог Кинопоиска</span>
          <span className="profile-setting__value">
            {showSources ? '▲' : '▼'}
          </span>
        </div>

        {showSources && (
          <div className="source-card">
            <div className="source-card__head">
              <span className="source-card__name">🔑 poiskkino.dev API</span>
              <span
                className={`source-card__badge source-card__badge--${
                  tokenStatus === 'ok' ? 'ok' : tokenStatus === 'err' ? 'err' : getToken() ? 'ok' : 'idle'
                }`}
              >
                {tokenStatus === 'ok' ? 'Онлайн' : tokenStatus === 'err' ? 'Ошибка' : getToken() ? 'Задан' : 'Нет токена'}
              </span>
            </div>

            <div className="source-card__field">
              <input
                className="source-card__input"
                type="text"
                placeholder="API-ключ poiskkino.dev"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="source-card__field">
              <button className="source-card__btn" onClick={handleSaveToken}>Сохранить</button>
              <button
                className="source-card__btn source-card__btn--ghost"
                onClick={handleCheckToken}
                disabled={tokenStatus === 'checking'}
              >
                {tokenStatus === 'checking' ? '…' : 'Проверить'}
              </button>
            </div>

            {tokenMsg && <p className="source-card__status">{tokenMsg}</p>}

            <p className="source-card__hint">
              API-ключ на <strong>poiskkino.dev</strong> (бесплатно).
              Можно задать серверной переменной <code>KINOPOISK_API_KEY</code>.
            </p>
          </div>
        )}

        {/* Плеер (embed pattern) */}
        <div className="profile-setting" onClick={() => setShowPlayer((v) => !v)}>
          <span className="profile-setting__label">🎬 Плеер</span>
          <span className="profile-setting__value">
            {showPlayer ? '▲' : '▼'}
          </span>
        </div>

        {showPlayer && (
          <div className="source-card">
            <div className="source-card__head">
              <span className="source-card__name">📺 URL плеера</span>
              <span className={`source-card__badge ${patternInput ? 'source-card__badge--ok' : 'source-card__badge--idle'}`}>
                {patternInput ? 'Задан' : 'По умолч.'}
              </span>
            </div>

            <div className="source-card__field">
              <input
                className="source-card__input"
                type="text"
                placeholder="https://kinobase.org/film/{ID}"
                value={patternInput}
                onChange={(e) => setPatternInput(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="source-card__field">
              <button className="source-card__btn" onClick={handleSavePattern}>Сохранить</button>
              <button
                className="source-card__btn source-card__btn--ghost"
                onClick={() => {
                  setPatternInput('');
                  setPlayerPattern('');
                  setPatternMsg('Сброшен. Используется Kinobase.');
                }}
              >
                Сбросить
              </button>
            </div>

            {patternMsg && <p className="source-card__status">{patternMsg}</p>}

            <p className="source-card__hint">
              <code>{'{ID}'}</code> — ID Кинопоиска.
              По умолчанию: <code>https://kinobase.org/film/{'{ID}'}</code>.
              YouTube всегда как фолбэк.
            </p>
          </div>
        )}
      </div>

      {/* Кнопка закрытия (безопасная, малозаметная) */}
      <div className="profile-close-wrap">
        <button className="profile-close" onClick={() => setShowCloseModal(true)}>
          Закрыть приложение
        </button>
      </div>

      {/* Модальное подтверждение */}
      {showCloseModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCloseModal(false); }}>
          <div className="modal-box">
            <div className="modal-box__icon">🚪</div>
            <h3 className="modal-box__title">Закрыть приложение?</h3>
            <p className="modal-box__text">
              Вы уверены, что хотите закрыть TeleCinema?<br />
              История и избранное сохранятся.
            </p>
            <div className="modal-box__actions">
              <button className="modal-box__btn modal-box__btn--cancel" onClick={() => setShowCloseModal(false)}>
                Остаться
              </button>
              <button className="modal-box__btn modal-box__btn--danger" onClick={closeApp}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
