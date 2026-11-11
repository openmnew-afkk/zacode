import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
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
        <rect x="3.5" y="3.5" width="7.2" height="7.2" rx="2.2" />
        <rect x="13.3" y="3.5" width="7.2" height="7.2" rx="2.2" />
        <rect x="3.5" y="13.3" width="7.2" height="7.2" rx="2.2" />
        <rect x="13.3" y="13.3" width="7.2" height="7.2" rx="2.2" />
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
    label: 'Оракул',
    accent: true,
    icon: <img className="tab-bar__mask" src="./zenova-mask-mini.png" alt="" draggable={false} />,
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

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => isActive(t.path))
  );

  return (
    <nav
      className="tab-bar"
      style={{ '--active-idx': activeIndex } as React.CSSProperties}
      aria-label="Основная навигация"
    >
      <div className="tab-bar__dock">
        {/* Hardware-accelerated sliding glass capsule for active tab */}
        <div className="tab-bar__glider-track" aria-hidden="true">
          <div className="tab-bar__glider">
            <span className="tab-bar__glider-beam" />
          </div>
        </div>

        <div className="tab-bar__inner">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                type="button"
                className={`tab-bar__item${active ? ' tab-bar__item--active' : ''}${tab.accent ? ' tab-bar__item--ai' : ''}`}
                onClick={() => {
                  if (!active) haptic('light');
                  navigate(tab.path);
                }}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
              >
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
      </div>
    </nav>
  );
};

export default React.memo(TabBar);
