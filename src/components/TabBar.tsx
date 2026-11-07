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
        <path d="M4 10.4 12 4l8 6.4V19a1.8 1.8 0 0 1-1.8 1.8h-3.8v-5.2a1.4 1.4 0 0 0-1.4-1.4h-2a1.4 1.4 0 0 0-1.4 1.4v5.2H5.8A1.8 1.8 0 0 1 4 19v-8.6Z" />
      </svg>
    ),
  },
  {
    path: '/search',
    label: 'Поиск',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.2 4.2" />
      </svg>
    ),
  },
  {
    path: '/ai',
    label: 'КиноИИ',
    accent: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 3.5 14 9.8l6.5 2.2-6.5 2.2L12 20.5l-2-6.3L3.5 12 10 9.8 12 3.5Z" />
      </svg>
    ),
  },
  {
    path: '/music',
    label: 'Музыка',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M9.5 17.8V5.6l10-1.8v12" />
        <circle cx="6.8" cy="17.8" r="2.6" />
        <circle cx="16.8" cy="15.8" r="2.6" />
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Профиль',
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8.2" r="3.4" />
        <path d="M5.2 19.5c.8-3.2 3.4-5 6.8-5s6 1.8 6.8 5" />
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
              <span className="tab-bar__pill" aria-hidden="true" />
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
