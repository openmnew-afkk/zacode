import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
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
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        {active ? (
          <path d="M12 2.5L2.5 10.5V20.5C2.5 21.05 2.95 21.5 3.5 21.5H8.5V14.5H15.5V21.5H20.5C21.05 21.5 21.5 21.05 21.5 20.5V10.5L12 2.5Z" fill="currentColor" />
        ) : (
          <path d="M12 2.5L2.5 10.5V20.5C2.5 21.05 2.95 21.5 3.5 21.5H8.5V14.5H15.5V21.5H20.5C21.05 21.5 21.5 21.05 21.5 20.5V10.5L12 2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    ),
  },
  {
    path: '/search',
    label: 'Поиск',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth={active ? '2.4' : '1.8'} />
        <path d="M16.5 16.5L21.5 21.5" stroke="currentColor" strokeWidth={active ? '2.6' : '1.8'} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    path: '/favorites',
    label: 'Списки',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        {active ? (
          <path d="M5 3.5C5 2.67 5.67 2 6.5 2H17.5C18.33 2 19 2.67 19 3.5V22L12 18L5 22V3.5Z" fill="currentColor" />
        ) : (
          <path d="M5 3.5C5 2.67 5.67 2 6.5 2H17.5C18.33 2 19 2.67 19 3.5V22L12 18L5 22V3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        )}
      </svg>
    ),
  },
  {
    path: '/music',
    label: 'Музыка',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        {active ? (
          <>
            <path d="M9 17V5L20 3V15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="6" cy="17" r="3" fill="currentColor" />
            <circle cx="17" cy="15" r="3" fill="currentColor" />
          </>
        ) : (
          <>
            <path d="M9 17V5L20 3V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="6" cy="17" r="3" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="17" cy="15" r="3" stroke="currentColor" strokeWidth="1.8" />
          </>
        )}
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Профиль',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        {active ? (
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12C10.34 12 9 10.66 9 9C9 7.34 10.34 6 12 6ZM12 20.2C9.5 20.2 7.29 18.92 6 16.98C6.03 14.99 10 13.9 12 13.9C13.99 13.9 17.97 14.99 18 16.98C16.71 18.92 14.5 20.2 12 20.2Z" fill="currentColor" />
        ) : (
          <>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="9" r="3.2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M6.2 18.4C7.4 16.4 9.6 15.2 12 15.2C14.4 15.2 16.6 16.4 17.8 18.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

  // Скрываем TabBar на странице фильма
  if (location.pathname.startsWith('/movie/')) return null;

  return (
    <nav className="tab-bar">
      <div className="tab-bar__inner">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              className={`tab-bar__item${active ? ' tab-bar__item--active' : ''}`}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
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