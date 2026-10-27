import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { getStoredSeason } from '../services/seasons';
import './TabBar.css';

interface TabDef {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabDef[] = [
  {
    path: '/',
    label: 'Главная',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="m3.5 10 8.5-7 8.5 7v9.5a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1V10Z" />
      </svg>
    ),
  },
  {
    path: '/ai',
    label: 'КиноИИ',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 3.5 13.9 10l6.6 2-6.6 2-1.9 6.5L10.1 14l-6.6-2 6.6-2L12 3.5Z" />
        <path d="m19 3 .6 2.1 2.1.6-2.1.6L19 8.4l-.6-2.1-2.1-.6 2.1-.6L19 3Z" />
      </svg>
    ),
  },
  {
    path: '/search',
    label: 'Поиск',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </svg>
    ),
  },
  {
    path: '/favorites',
    label: 'Списки',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6 4.5h12v16l-6-3.8-6 3.8v-16Z" />
      </svg>
    ),
  },
  {
    path: '/music',
    label: 'Музыка',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M10 18V5l10-2v13" />
        <circle cx="7" cy="18" r="3" />
        <circle cx="17" cy="16" r="3" />
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Профиль',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4.5 20c.5-3.5 3.4-5.5 7.5-5.5s7 2 7.5 5.5" />
      </svg>
    ),
  },
];

const TabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites } = useStore();
  const season = getStoredSeason().season.id;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const seasonalPage = season === 'winter'
    ? { path: '/new-year', label: 'Открыть зимнюю сказку' }
    : season === 'autumn'
      ? { path: '/halloween', label: 'Открыть хэллоуинскую историю' }
      : null;

  return (
    <nav className="tab-bar" aria-label="Основная навигация">
      {seasonalPage && (
        <button
          className={`tab-bar__season tab-bar__season--${season}`}
          type="button"
          onClick={() => navigate(seasonalPage.path)}
          aria-label={seasonalPage.label}
          title={seasonalPage.label}
        >
          <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            {season === 'winter' ? (
              <>
                <path className="tab-bar__season-star" d="m32 3 3.2 7.3 7.9.7-6 5.2 1.8 7.8-6.9-4.1-6.9 4.1 1.8-7.8-6-5.2 7.9-.7L32 3Z" />
                <path className="tab-bar__season-tree" d="m32 14-13 17h7L14 44h12L10 56h44L38 44h12L38 31h7L32 14Z" />
                <path className="tab-bar__season-snow" d="M22 31h20M16 44h32M14 55h36" />
                <path className="tab-bar__season-trunk" d="M30 50h4v11h-4z" />
                <circle className="tab-bar__season-light" cx="32" cy="27" r="2" />
                <circle className="tab-bar__season-light" cx="25" cy="39" r="1.7" />
                <circle className="tab-bar__season-light" cx="39" cy="39" r="1.7" />
              </>
            ) : (
              <>
                <path className="tab-bar__season-leaf" d="M47 13c-7 0-12 4-14 11 7 0 12-4 14-11Z" />
                <path className="tab-bar__season-stem" d="M33 25c4-5 8-8 13-11" />
                <path className="tab-bar__season-pumpkin" d="M31 22c-3-4-10-2-12 3-8-3-13 4-13 13 0 10 5 17 14 17 4 0 7-2 10-4 3 2 6 4 10 4 9 0 14-7 14-17 0-9-5-16-13-13-2-5-9-7-13-3h3Z" />
                <path className="tab-bar__season-rib" d="M31 25c-4 6-4 21 0 27m2-27c4 6 4 21 0 27M18 29c-3 6-3 14 0 19" />
                <path className="tab-bar__season-face" d="m24 37 2 3 2-3m8 0 2 3 2-3m-15 9c5 4 12 4 17 0" />
              </>
            )}
          </svg>
        </button>
      )}
      <div className="tab-bar__inner">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              type="button"
              className={`tab-bar__item${active ? ' tab-bar__item--active' : ''}`}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="tab-bar__icon" aria-hidden="true">{tab.icon}</span>
              <span className="tab-bar__label">{tab.label}</span>
              {tab.path === '/favorites' && favorites.length > 0 && (
                <span className="tab-bar__badge">
                  {favorites.length > 99 ? '99+' : favorites.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabBar;