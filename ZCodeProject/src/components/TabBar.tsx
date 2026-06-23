import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import './TabBar.css';

/* ===== ULTRA PREMIUM Нижняя навигация ===== */

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
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5H4a1 1 0 0 1-1-1V9.5z"
            fill="url(#hg)" />
        ) : (
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {active && (
          <defs>
            <linearGradient id="hg" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a78bfa" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
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
            <circle cx="11" cy="11" r="7" fill="url(#sg)" opacity="0.85" />
            <line x1="16.5" y1="16.5" x2="21" y2="21"
              stroke="url(#sl)" strokeWidth="2.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="sg" x1="4" y1="4" x2="18" y2="18" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a78bfa" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="sl" x1="16" y1="16" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7c3aed" />
                <stop offset="1" stopColor="#0891b2" />
              </linearGradient>
            </defs>
          </>
        ) : (
          <>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <line x1="16.5" y1="16.5" x2="21" y2="21"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
          <>
            <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
              fill="url(#fg)" />
            <defs>
              <linearGradient id="fg" x1="3" y1="5" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f472b6" />
                <stop offset="1" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </>
        ) : (
          <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
            <circle cx="12" cy="8" r="4" fill="url(#prg)" />
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="url(#prs)" strokeWidth="2" strokeLinecap="round" />
            <defs>
              <linearGradient id="prg" x1="8" y1="4" x2="16" y2="12" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a78bfa" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="prs" x1="4" y1="13" x2="20" y2="21" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7c3aed" />
                <stop offset="1" stopColor="#0891b2" />
              </linearGradient>
            </defs>
          </>
        ) : (
          <>
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
