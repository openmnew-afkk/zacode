import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
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

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="tab-bar" aria-label="Основная навигация">
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