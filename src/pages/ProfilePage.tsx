import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import './ProfilePage.css';

interface MenuItem {
  icon: string;
  color: string;
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

  const displayName = user ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : 'Гость';
  const username = user?.username ? `@${user.username}` : (telegramUsername ? `@${telegramUsername}` : '');
  const isAdminUser = user?.username === 'MikySauce' || role === 'admin' || role === 'moderator';

  const groups: MenuGroup[] = [
    {
      title: 'МЕДИАТЕКА',
      items: [
        {
          icon: '❤️',
          color: '#ef4444',
          bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
          label: 'Избранное',
          sub: `${favorites.length} фильмов и сериалов`,
          action: () => navigate('/favorites'),
        },
        {
          icon: '⏱',
          color: '#3b82f6',
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
          icon: isPremium ? '👑' : '⭐',
          color: '#f59e0b',
          bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
          label: isPremium ? 'Премиум активен' : 'Подключить Премиум',
          sub: isPremium ? 'Без рекламы · Максимальное качество' : 'От 99 ₽ · 3 дня бесплатно',
          action: () => navigate('/premium'),
          highlight: !isPremium,
        },
        {
          icon: '🎵',
          color: '#a855f7',
          bg: 'linear-gradient(135deg, #a855f7, #9333ea)',
          label: 'Музыка',
          sub: 'Фоновое воспроизведение и хиты',
          action: () => navigate('/music'),
        },
        {
          icon: '🔍',
          color: '#06b6d4',
          bg: 'linear-gradient(135deg, #06b6d4, #0891b2)',
          label: 'Каталог и поиск',
          sub: 'Фильмы, сериалы и мультфильмы',
          action: () => navigate('/search'),
        },
      ],
    },
    {
      title: 'НАСТРОЙКИ',
      items: [
        {
          icon: theme === 'dark' ? '🌙' : '☀️',
          color: '#6366f1',
          bg: 'linear-gradient(135deg, #6366f1, #4f46e5)',
          label: 'Оформление',
          sub: theme === 'dark' ? 'Тёмная тема (OLED)' : 'Фиолетовый акцент',
          action: () => {
            haptic('light');
            setTheme(theme === 'dark' ? 'violet' : 'dark');
          },
        },
        {
          icon: '📜',
          color: '#64748b',
          bg: 'linear-gradient(135deg, #64748b, #475569)',
          label: 'Правила и соглашение',
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
          icon: '⚙️',
          color: '#ec4899',
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
              <span>{displayName[0]?.toUpperCase() || '?'}</span>
            )}
          </div>
          {isPremium && <div className="pf__premium-dot">👑</div>}
        </div>

        <div className="pf__user-meta">
          <h1 className="pf__name">
            {displayName}
            {(isAdminUser || isPremium) && <span className="pf__verified">✓</span>}
          </h1>
          {username && <p className="pf__username">{username}</p>}
          <div className="pf__badges">
            {isPremium ? (
              <span className="pf__badge pf__badge--premium">👑 PREMIUM</span>
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
                    <span>{item.icon}</span>
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

      <div className="pf__footer">KINOVERSE · Все права защищены</div>
    </div>
  );
};

export default ProfilePage;