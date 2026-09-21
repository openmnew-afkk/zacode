import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import './ProfilePage.css';

interface MenuItem {
  icon: React.ReactNode;
  bg: string;
  label: string;
  sub: string;
  action: () => void;
  highlight?: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, closeApp, haptic, tg } = useTelegram();
  const { favorites, watchHistory, clearHistory, isPremium, theme, setTheme, role, telegramUsername } = useStore();

  const displayName = user ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : 'Пользователь';
  const username = user?.username ? `@${user.username}` : (telegramUsername ? `@${telegramUsername}` : '');
  const isAdminUser = user?.username === 'MikySauce' || role === 'admin' || role === 'moderator';

  const groups: MenuGroup[] = [
    {
      title: 'МЕДИАТЕКА',
      items: [
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ),
          bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
          label: 'Избранное',
          sub: `${favorites.length} сохранено`,
          action: () => navigate('/favorites'),
        },
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" />
              <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ),
          bg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          label: 'История просмотров',
          sub: `${watchHistory.length} просмотрено`,
          action: () => navigate('/favorites'),
        },
      ],
    },
    {
      title: 'ПОДПИСКА И СЕРВИСЫ',
      items: [
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" />
              <rect x="4" y="18" width="16" height="2.2" rx="1.1" />
            </svg>
          ),
          bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
          label: isPremium ? 'Премиум подписка' : 'Оформить Премиум',
          sub: isPremium ? 'Все привилегии активны' : 'Без рекламы · 3 дня бесплатно',
          action: () => navigate('/premium'),
          highlight: !isPremium,
        },
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M9 17V5L20 3V15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="17" r="3" fill="currentColor" />
              <circle cx="17" cy="15" r="3" fill="currentColor" />
            </svg>
          ),
          bg: 'linear-gradient(135deg, #a855f7, #9333ea)',
          label: 'Музыка AURA',
          sub: 'Русские и мировые хиты · Моя волна',
          action: () => navigate('/music'),
        },
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2.2" />
              <path d="M16 16L21 21" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          ),
          bg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
          label: 'Каталог и поиск',
          sub: 'Тысячи фильмов и сериалов',
          action: () => navigate('/search'),
        },
      ],
    },
    {
      title: 'НАСТРОЙКИ',
      items: [
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
            </svg>
          ),
          bg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          label: 'Оформление',
          sub: theme === 'dark' ? 'Глубокая тёмная тема' : 'Фиолетовый неоновый акцент',
          action: () => {
            haptic('light');
            setTheme(theme === 'dark' ? 'violet' : 'dark');
          },
        },
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          ),
          bg: 'linear-gradient(135deg, #64748b, #475569)',
          label: 'Пользовательское соглашение',
          sub: 'Правовая информация',
          action: () => navigate('/rules'),
        },
      ],
    },
  ];

  if (isAdminUser) {
    groups.push({
      title: 'АДМИНИСТРИРОВАНИЕ',
      items: [
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          ),
          bg: 'linear-gradient(135deg, #ec4899, #db2777)',
          label: role === 'moderator' && user?.username !== 'MikySauce' ? 'Панель модератора' : 'Панель администратора',
          sub: 'Управление пользователями и контентом',
          action: () => navigate('/admin'),
        },
      ],
    });
  }

  return (
    <div className="pf page">
      {/* BG gradient */}
      <div className="pf__bg" />

      {/* iOS User Profile Card */}
      <div className="pf__card">
        <div className="pf__avatar-wrap">
          <div className="pf__avatar-ring" />
          <div className="pf__avatar">
            {user?.photo_url ? (
              <img src={user.photo_url} alt="" />
            ) : (
              <span>{displayName[0]?.toUpperCase() || 'A'}</span>
            )}
          </div>
          {isPremium && (
            <div className="pf__premium-dot">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#fbbf24">
                <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" />
              </svg>
            </div>
          )}
        </div>

        <div className="pf__user-meta">
          <h1 className="pf__name">
            {displayName}
            {(isAdminUser || isPremium) && <span className="pf__verified">✓</span>}
          </h1>
          {username && <p className="pf__username">{username}</p>}
          <div className="pf__badges">
            {isPremium ? (
              <span className="pf__badge pf__badge--premium">AURA PRO</span>
            ) : (
              <span className="pf__badge">БАЗОВЫЙ ДОСТУП</span>
            )}
            {isAdminUser && <span className="pf__badge pf__badge--admin">ADMIN</span>}
          </div>
        </div>
      </div>

      {/* iOS Metrics Bar */}
      <div className="pf__stats">
        <div className="pf__stat" onClick={() => navigate('/favorites')}>
          <span className="pf__stat-val">{watchHistory.length}</span>
          <span className="pf__stat-lbl">Просмотрено</span>
        </div>
        <div className="pf__stat-div" />
        <div className="pf__stat" onClick={() => navigate('/favorites')}>
          <span className="pf__stat-val">{favorites.length}</span>
          <span className="pf__stat-lbl">В избранном</span>
        </div>
        <div className="pf__stat-div" />
        <div className="pf__stat" onClick={() => navigate('/premium')}>
          <span className="pf__stat-val">{isPremium ? 'PRO' : 'FREE'}</span>
          <span className="pf__stat-lbl">Тариф</span>
        </div>
      </div>

      {/* iOS Inset Grouped Sections */}
      <div className="pf__groups">
        {groups.map((grp, gIdx) => (
          <div key={gIdx} className="pf__group">
            <div className="pf__group-title">{grp.title}</div>
            <div className="pf__group-box">
              {grp.items.map((item, iIdx) => (
                <button
                  key={iIdx}
                  className={`pf__row ${item.highlight ? 'pf__row--highlight' : ''}`}
                  onClick={item.action}
                >
                  <div className="pf__icon-box" style={{ background: item.bg }}>
                    {item.icon}
                  </div>
                  <div className="pf__row-content">
                    <div className="pf__row-text">
                      <span className="pf__row-label">{item.label}</span>
                      <span className="pf__row-sub">{item.sub}</span>
                    </div>
                    <span className="pf__arrow">›</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Watch History Preview */}
      {watchHistory.length > 0 && (
        <div className="pf__group">
          <div className="pf__history-header">
            <span className="pf__group-title">НЕДАВНО СМОТРЕЛИ</span>
            <button className="pf__clear-btn" onClick={clearHistory}>
              Очистить
            </button>
          </div>
          <div className="pf__history-scroll">
            {watchHistory.slice(0, 8).map((item) => (
              <div
                key={item.movie.id}
                className="pf__hist-card"
                onClick={() => navigate(`/movie/${item.movie.id}`)}
              >
                <div className="pf__hist-poster">
                  <img src={item.movie.poster_path || ''} alt="" loading="lazy" />
                </div>
                <span className="pf__hist-title">{item.movie.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tg && (
        <div className="pf__exit-wrap">
          <button className="pf__close-btn" onClick={closeApp}>
            Закрыть приложение
          </button>
        </div>
      )}

      <div className="pf__footer">AURA · Все права защищены</div>
    </div>
  );
};

export default ProfilePage;