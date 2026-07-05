import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import './TabBar.css';

interface TabDef {
  path: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const tabs: TabDef[] = [
  {
    path: '/',
    label: 'Главная',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {active ? (
          <path d="M12 3.2L4 9.5V20a1 1 0 0 0 1 1h5v-6h4v6h5a1 1 0 0 0 1-1V9.5L12 3.2z" fill="currentColor"/>
        ) : (
          <path d="M4 9.5L12 3l8 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        )}
      </svg>
    ),
  },
  {
    path: '/search',
    label: 'Поиск',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {active ? (
          <>
            <circle cx="11" cy="11" r="6.5" fill="currentColor"/>
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </>
        ) : (
          <>
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </>
        )}
      </svg>
    ),
  },
  {
    path: '/favorites',
    label: 'Избранное',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {active ? (
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
        ) : (
          <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3z" stroke="currentColor" strokeWidth="1.6"/>
        )}
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Профиль',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        {active ? (
          <>
            <circle cx="12" cy="8" r="4" fill="currentColor"/>
            <path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7" fill="currentColor"/>
          </>
        ) : (
          <>
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </>
        )}
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

  if (location.pathname.startsWith('/movie/')) return null;

  return (
    <nav className="tab-bar" role="navigation" aria-label="Навигация">
      <div className="tab-bar__inner">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              className={`tab-bar__item${active ? ' tab-bar__item--active' : ''}`}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="tab-bar__icon">{tab.icon(active)}</span>
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
