import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import VeloraEmblem from '../components/VeloraEmblem';
import RulesModal from '../components/RulesModal';
import { resolveUserAccess } from '../services/accessControl';
import './ProfilePage.css';

interface MenuItem {
  icon: React.ReactNode;
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
  const { favorites, watchHistory, clearHistory, isPremium, premiumExpiry, theme, setTheme, role, telegramUsername } = useStore();
  const [showRules, setShowRules] = useState(false);

  const daysLeft = premiumExpiry
    ? Math.max(1, Math.ceil((premiumExpiry - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  const displayName = user ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : 'Пользователь';
  const username = user?.username ? `@${user.username}` : (telegramUsername ? `@${telegramUsername}` : '');
  const effectiveUser = user?.username || telegramUsername || '';
  const userAccess = resolveUserAccess(effectiveUser);
  const isAdminUser = userAccess.isAdmin || userAccess.isModerator || role === 'admin' || role === 'moderator' || user?.username === 'MikySauce';
  const effectivePremium = isPremium || userAccess.isVip;

  const groups: MenuGroup[] = [
    {
      title: 'МЕДИАТЕКА',
      items: [
        {
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          ),
          label: 'Избранное',
          sub: `${favorites.length} сохранено`,
          action: () => navigate('/favorites'),
        },
        {
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7V12L15 15" strokeLinecap="round" />
            </svg>
          ),
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1">
              <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" />
              <rect x="4" y="18" width="16" height="2" rx="1" />
            </svg>
          ),
          label: isPremium ? 'Премиум подписка' : 'Оформить Премиум',
          sub: isPremium ? 'Все привилегии активны' : 'Без рекламы · 3 дня бесплатно',
          action: () => navigate('/premium'),
          highlight: !isPremium,
        },
        {
          icon: (
            <div className="tab-bar__wave active" style={{ width: 18, height: 18 }}>
              <span /><span /><span /><span /><span />
            </div>
          ),
          label: 'Музыка VELORA',
          sub: 'Русские и мировые хиты · Моя волна',
          action: () => navigate('/music'),
        },
        {
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16L21 21" strokeWidth="2.2" />
            </svg>
          ),
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {theme === 'dark' ? (
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </>
              )}
            </svg>
          ),
          label: 'Оформление',
          sub: theme === 'dark' ? 'Глубокая тёмная тема' : 'Нежная светлая с розовыми нотками',
          action: () => {
            haptic('medium');
            setTheme(theme === 'dark' ? 'light' : 'dark');
          },
        },
        {
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          ),
          label: 'Пользовательское соглашение',
          sub: 'Правовая информация',
          action: () => {
            haptic('light');
            setShowRules(true);
          },
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="1.9" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          ),
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

      {/* VIP Metal Profile Card */}
      <div className="pf__card">
        <div className="pf__card-shine" />
        <div className="pf__card-top">
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
            <div className="pf__user-title-row">
              <h1 className="pf__name">{displayName}</h1>
              {(isAdminUser || effectivePremium) && (
                <span className="pf__verified" title="Верифицирован">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
              )}
            </div>
            {username && <p className="pf__username">{username}</p>}
            <div className="pf__badges">
              {effectivePremium ? (
                <span className="pf__badge pf__badge--premium">👑 VELORA VIP PRO</span>
              ) : (
                <span className="pf__badge">БАЗОВЫЙ УРОВЕНЬ</span>
              )}
              {isAdminUser && <span className="pf__badge pf__badge--admin">ADMIN</span>}
            </div>
          </div>

          <VeloraEmblem size="sm" className="pf__card-emblem" />
        </div>

        <div className="pf__vip-status-bar" onClick={() => navigate('/premium')}>
          <div className="pf__vip-status-left">
            <span className={`pf__vip-dot ${effectivePremium ? 'active' : ''}`} />
            <span className="pf__vip-status-text">
              {effectivePremium
                ? (isAdminUser ? 'Бессрочный VIP доступ' : `Подписка активна · ${daysLeft ? `${daysLeft} дн.` : ''}`)
                : 'Попробуйте 2 дня VIP бесплатно'}
            </span>
          </div>
          <span className="pf__vip-action-btn">
            {effectivePremium ? 'Продлить' : 'Активировать'} →
          </span>
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
          <span className="pf__stat-val">{effectivePremium ? 'PRO' : 'FREE'}</span>
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
                  <div className="pf__icon-box">
                    {item.icon}
                  </div>
                  <div className="pf__row-content">
                    <div className="pf__row-text">
                      <span className="pf__row-label">{item.label}</span>
                      <span className="pf__row-sub">{item.sub}</span>
                    </div>
                    <span className="pf__arrow">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </span>
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

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      <div className="pf__footer">VELORA · Все права защищены</div>
    </div>
  );
};

export default ProfilePage;