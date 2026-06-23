import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store/useStore';
import { posterUrl, getPlayerPattern, setPlayerPattern, getTmdbKey, setTmdbKey, checkTmdb, hasTmdbKey } from '../api/catalog';
import './ProfilePage.css';

/* ===== Страница профиля ===== */

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, closeApp } = useTelegram();
  const { favorites, watchHistory, theme, toggleTheme, clearHistory } = useStore();

  // Плеер
  const [showPlayer, setShowPlayer] = useState(false);
  const [patternInput, setPatternInput] = useState(getPlayerPattern());
  const [patternMsg, setPatternMsg] = useState('');

  // TMDB ключ
  const [showTmdb, setShowTmdb] = useState(false);
  const [tmdbInput, setTmdbInput] = useState(getTmdbKey());
  const [tmdbStatus, setTmdbStatus] = useState<'idle' | 'checking' | 'ok' | 'err'>('idle');
  const [tmdbMsg, setTmdbMsg] = useState('');

  // Модалка закрытия
  const [showCloseModal, setShowCloseModal] = useState(false);

  const displayName = user
    ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`
    : 'Гость';
  const username = user?.username ? `@${user.username}` : '';

  const handleSavePattern = () => {
    setPlayerPattern(patternInput.trim());
    setPatternMsg('✓ Паттерн сохранён');
    setTimeout(() => setPatternMsg(''), 3000);
  };

  return (
    <div className="profile-page page">
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

      {/* История */}
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

        <div className="profile-setting" onClick={toggleTheme}>
          <span className="profile-setting__label">
            {theme === 'dark' ? '🌙 Тема' : '☀️ Тема'}
          </span>
          <span className="profile-setting__value">
            {theme === 'dark' ? 'Тёмная' : 'Светлая'}
          </span>
        </div>

        {/* Плеер */}
        <div className="profile-setting" onClick={() => setShowPlayer((v) => !v)}>
          <span className="profile-setting__label">🎬 Плеер</span>
          <span className="profile-setting__value">
            {showPlayer ? '▲' : patternInput ? 'Свой' : 'По умолч.'}
          </span>
        </div>

        {showPlayer && (
          <div className="source-card">
            <div className="source-card__head">
              <span className="source-card__name">📺 URL плеера</span>
              <span className={`source-card__badge ${patternInput ? 'source-card__badge--ok' : 'source-card__badge--idle'}`}>
                {patternInput ? 'Задан' : 'Kinobase'}
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
              <button className="source-card__btn source-card__btn--ghost" onClick={() => {
                setPatternInput('');
                setPlayerPattern('');
                setPatternMsg('✓ Сброшен на Kinobase');
              }}>Сбросить</button>
            </div>
            {patternMsg && <p className="source-card__status">{patternMsg}</p>}
            <p className="source-card__hint">
              <code>{'{ID}'}</code> — IMDb ID фильма (например tt0133093).
              По умолчанию плеер ищет на <strong>kinobase.org</strong>.
              YouTube всегда доступен как запасной.
            </p>
          </div>
        )}
      </div>

      {/* ===== TMDB ===== */}
      <div className="profile-setting" onClick={() => setShowTmdb((v) => !v)}>
        <span className="profile-setting__label">🎬 TMDB API</span>
        <span className="profile-setting__value">
          {showTmdb ? '▲' : getTmdbKey() ? 'Задан' : 'Не задан'}
        </span>
      </div>

      {showTmdb && (
        <div className="source-card">
          <div className="source-card__head">
            <span className="source-card__name">🔑 Ключ TMDB</span>
            <span className={`source-card__badge source-card__badge--${tmdbStatus === 'ok' ? 'ok' : tmdbStatus === 'err' ? 'err' : getTmdbKey() ? 'ok' : 'idle'}`}>
              {tmdbStatus === 'ok' ? 'Онлайн' : tmdbStatus === 'err' ? 'Ошибка' : getTmdbKey() ? 'Задан' : 'Нет ключа'}
            </span>
          </div>
          <div className="source-card__field">
            <input
              className="source-card__input"
              type="text"
              placeholder="Ваш TMDB API ключ (v3)"
              value={tmdbInput}
              onChange={(e) => setTmdbInput(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="source-card__field">
            <button className="source-card__btn" onClick={() => {
              setTmdbKey(tmdbInput.trim());
              setTmdbMsg('✓ Ключ сохранён');
              setTmdbStatus('idle');
              setTimeout(() => setTmdbMsg(''), 3000);
            }}>Сохранить</button>
            <button className="source-card__btn source-card__btn--ghost" onClick={async () => {
              setTmdbStatus('checking');
              const res = await checkTmdb();
              setTmdbStatus(res.ok ? 'ok' : 'err');
              setTmdbMsg(res.message);
            }}>{tmdbStatus === 'checking' ? '…' : 'Проверить'}</button>
          </div>
          {tmdbMsg && <p className="source-card__status">{tmdbMsg}</p>}
          <p className="source-card__hint">
            TMDB = русские названия, описания, постеры, рейтинги.
            Ключ бесплатный — <strong>themoviedb.org</strong> → Settings → API.
            Без ключа используется OMDb (английский).
          </p>
        </div>
      )}

      {/* Кнопка закрытия */}
      <div className="profile-close-wrap">
        <button className="profile-close" onClick={() => setShowCloseModal(true)}>
          Закрыть приложение
        </button>
      </div>

      {/* Модалка */}
      {showCloseModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCloseModal(false); }}>
          <div className="modal-box">
            <div className="modal-box__icon">🚪</div>
            <h3 className="modal-box__title">Закрыть приложение?</h3>
            <p className="modal-box__text">История и избранное сохранятся.</p>
            <div className="modal-box__actions">
              <button className="modal-box__btn modal-box__btn--cancel" onClick={() => setShowCloseModal(false)}>Остаться</button>
              <button className="modal-box__btn modal-box__btn--danger" onClick={closeApp}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
