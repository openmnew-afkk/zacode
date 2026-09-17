import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, closeApp, haptic, tg } = useTelegram();
  const { favorites, watchHistory, clearHistory, isPremium, theme, setTheme, role, telegramUsername } = useStore();

  const displayName = user ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : 'Гость';
  const username = user?.username ? `@${user.username}` : (telegramUsername ? `@${telegramUsername}` : '');
  const isAdminUser = user?.username === 'MikySauce' || role === 'admin' || role === 'moderator';

  const menuItems = [
    {
      icon: '❤️',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.15)',
      label: 'Избранное',
      sub: `${favorites.length} фильмов`,
      action: () => navigate('/favorites'),
    },
    {
      icon: '🔍',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.15)',
      label: 'Поиск',
      sub: 'Найти фильм или сериал',
      action: () => navigate('/search'),
    },
    {
      icon: '🎵',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.15)',
      label: 'Музыка',
      sub: 'Слушать прямо сейчас',
      action: () => navigate('/music'),
    },
    {
      icon: isPremium ? '👑' : '⭐',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.15)',
      label: isPremium ? 'Премиум активен' : 'Подключить Премиум',
      sub: isPremium ? 'Все функции открыты' : '199 ₽/мес · 2400 ₽/год',
      action: () => navigate('/premium'),
      highlight: !isPremium,
    },
    {
      icon: theme === 'dark' ? '🌙' : '☀️',
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.15)',
      label: theme === 'dark' ? 'Тёмная тема' : 'Светлая тема',
      sub: 'Нажми чтобы переключить',
      action: () => { haptic('light'); setTheme(theme === 'dark' ? 'violet' : 'dark'); },
    },
    {
      icon: '📜',
      color: '#64748b',
      bg: 'rgba(100,116,139,0.15)',
      label: 'Правила',
      sub: 'Правовая информация',
      action: () => navigate('/rules'),
    },
  ];

  if (isAdminUser) {
    menuItems.push({
      icon: '⚙️',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.18)',
      label: role === 'moderator' && user?.username !== 'MikySauce' ? 'Панель модератора' : 'Админ панель',
      sub: 'Управление приложением',
      action: () => navigate('/admin'),
    });
  }

  return (
    <div className="pf page">
      {/* BG gradient */}
      <div className="pf__bg" />

      {/* Avatar with gradient ring — like photo 3 */}
      <div className="pf__header">
        <div className="pf__avatar-wrap">
          <div className="pf__avatar-ring" />
          <div className="pf__avatar">
            {user?.photo_url
              ? <img src={user.photo_url} alt="" />
              : <span>{displayName[0]?.toUpperCase() || '?'}</span>
            }
          </div>
          {isPremium && <div className="pf__premium-dot">👑</div>}
        </div>

        <h1 className="pf__name">
          {displayName}
          {(isAdminUser || isPremium) && <span className="pf__verified">✓</span>}
        </h1>
        {username && <p className="pf__username">{username}</p>}
        {isPremium && <div className="pf__premium-badge">✨ PREMIUM</div>}
      </div>

      {/* Stats */}
      <div className="pf__stats">
        <div className="pf__stat" onClick={() => navigate('/favorites')}>
          <span className="pf__stat-val">{watchHistory.length}</span>
          <span className="pf__stat-lbl">Просмотрено</span>
        </div>
        <div className="pf__stat-div" />
        <div className="pf__stat" onClick={() => navigate('/favorites')}>
          <span className="pf__stat-val">{favorites.length}</span>
          <span className="pf__stat-lbl">Избранное</span>
        </div>
        <div className="pf__stat-div" />
        <div className="pf__stat">
          <span className="pf__stat-val">{isPremium ? '👑' : '—'}</span>
          <span className="pf__stat-lbl">Премиум</span>
        </div>
      </div>

      {/* Menu items — like photo 3 */}
      <div className="pf__menu">
        {menuItems.map((item, i) => (
          <button
            key={i}
            className={`pf__item ${item.highlight ? 'pf__item--highlight' : ''}`}
            onClick={item.action}
          >
            <span className="pf__item-icon" style={{ background: item.bg, color: item.color }}>
              {item.icon}
            </span>
            <div className="pf__item-text">
              <span className="pf__item-label">{item.label}</span>
              <span className="pf__item-sub">{item.sub}</span>
            </div>
            <span className="pf__item-arrow">›</span>
          </button>
        ))}
      </div>

      {/* History */}
      {watchHistory.length > 0 && (
        <div className="pf__section">
          <div className="pf__section-hd">
            <span className="pf__section-title">История просмотров</span>
            <button className="pf__clear" onClick={clearHistory}>Очистить</button>
          </div>
          <div className="pf__history">
            {watchHistory.slice(0, 10).map((item) => (
              <div key={item.movie.id} className="pf__hist-item" onClick={() => navigate(`/movie/${item.movie.id}`)}>
                <img src={item.movie.poster_path || ''} alt="" />
                <div>
                  <p className="pf__hist-title">{item.movie.title}</p>
                  <p className="pf__hist-date">{new Date(item.watchedAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <span className="pf__item-arrow">›</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tg && (
        <button className="pf__close" onClick={closeApp}>Закрыть приложение</button>
      )}

      <div className="pf__footer">КиноЗал · Все права защищены</div>
    </div>
  );
};

export default ProfilePage;