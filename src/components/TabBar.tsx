import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { getStoredSeason } from '../services/seasons';
import { useTelegram } from '../hooks/useTelegram';
import './TabBar.css';

interface TabDef {
  path: string;
  label: string;
  accent?: boolean;
  icon: React.ReactNode;
}

const tabs: TabDef[] = [
  {
    path: '/',
    label: 'Главная',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="m3.5 10.2 8.5-6.7 8.5 6.7v9.3a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.8a1.2 1.2 0 0 0-1.2-1.2h-3.2a1.2 1.2 0 0 0-1.2 1.2V21H5a1.5 1.5 0 0 1-1.5-1.5v-9.3Z" />
      </svg>
    ),
  },
  {
    path: '/studios',
    label: 'Миры',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="7.5" height="7.5" rx="2.2" />
        <rect x="13.5" y="4" width="7.5" height="7.5" rx="2.2" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" />
        <path d="M17.25 13.5v7.5M13.5 17.25h7.5" />
      </svg>
    ),
  },
  {
    path: '/ai',
    label: 'КиноИИ',
    accent: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 3.2 14.1 9.8l6.7 2.2-6.7 2.2L12 20.8l-2.1-6.6L3.2 12l6.7-2.2L12 3.2Z" />
        <path d="m19 3 .5 1.8 1.8.5-1.8.5L19 7.6l-.5-1.8-1.8-.5 1.8-.5L19 3Z" />
      </svg>
    ),
  },
  {
    path: '/search',
    label: 'Поиск',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="6.8" />
        <path d="m16.2 16.2 4.3 4.3" />
      </svg>
    ),
  },
  {
    path: '/music',
    label: 'Музыка',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9.5 18V5.5l10.5-2V16" />
        <circle cx="6.8" cy="18" r="2.8" />
        <circle cx="17.2" cy="16" r="2.8" />
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Профиль',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8.2" r="3.6" />
        <path d="M4.8 19.8c.7-3.4 3.5-5.3 7.2-5.3s6.5 1.9 7.2 5.3" />
      </svg>
    ),
  },
];

const TabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites } = useStore();
  const { haptic } = useTelegram();
  const [seasonId, setSeasonId] = useState(() => getStoredSeason().season.id);

  useEffect(() => {
    const sync = () => setSeasonId(getStoredSeason().season.id);
    window.addEventListener('zenova-season-change', sync);
    return () => window.removeEventListener('zenova-season-change', sync);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className={`tab-bar tab-bar--season-${seasonId}`}
      aria-label="Основная навигация"
    >
      {/* Новогодняя снежная кромка и сияние на доке в зимнем режиме */}
      {seasonId === 'winter' && (
        <div className="tab-bar__frost-cap" aria-hidden="true">
          <span className="tab-bar__frost-spark s1" />
          <span className="tab-bar__frost-spark s2" />
          <span className="tab-bar__frost-spark s3" />
        </div>
      )}

      <div className="tab-bar__inner">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              type="button"
              className={`tab-bar__item${active ? ' tab-bar__item--active' : ''}${
                tab.accent ? ' tab-bar__item--accent' : ''
              }`}
              onClick={() => {
                haptic('light');
                navigate(tab.path);
              }}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="tab-bar__pill-bg" aria-hidden="true" />
              <span className="tab-bar__icon" aria-hidden="true">
                {tab.icon}
              </span>
              <span className="tab-bar__label">{tab.label}</span>
              {tab.path === '/profile' && favorites.length > 0 && (
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
