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

  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => isActive(t.path))
  );

  const activeTab = tabs[activeIndex] || tabs[0];

  return (
    <nav
      className={`tab-bar tab-bar--season-${seasonId}`}
      style={{ '--active-idx': activeIndex } as React.CSSProperties}
      aria-label="Основная навигация"
    >
      <div className="tab-bar__shell">
        {/* ── Transparent Glass-Bubble Scalloped Dock Body with Sliding Concave Cradle ── */}
        <div className="tab-bar__cradle-viewport" aria-hidden="true">
          <svg
            className="tab-bar__cradle-svg"
            viewBox="0 0 1500 84"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Translucent crystal-bubble glass fill */}
              <linearGradient id="zenovaDockBody" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.14)" />
                <stop offset="35%" stopColor="rgba(24, 24, 38, 0.42)" />
                <stop offset="100%" stopColor="rgba(10, 10, 18, 0.58)" />
              </linearGradient>

              {/* Soap-bubble iridescent top rim stroke */}
              <linearGradient id="zenovaDockShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.22)" />
                <stop offset="28%" stopColor="rgba(125, 211, 252, 0.55)" />
                <stop offset="36.6%" stopColor="rgba(255, 255, 255, 0.95)" />
                <stop offset="45%" stopColor="rgba(244, 114, 182, 0.65)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.22)" />
              </linearGradient>

              {/* Soft bubble refraction glow inside the concave dip */}
              <radialGradient id="zenovaCradleGlow" cx="550" cy="20" r="64" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.26)" />
                <stop offset="50%" stopColor="rgba(244, 63, 94, 0.18)" />
                <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
              </radialGradient>
            </defs>

            {/* Main transparent glass surface with smooth concave dip at x = 550 */}
            <path
              d="M 0 14 L 490 14 C 508 14, 514 54, 550 54 C 586 54, 592 14, 610 14 L 1500 14 L 1500 84 L 0 84 Z"
              fill="url(#zenovaDockBody)"
            />

            {/* Bubble refraction glow hugging the concave cradle */}
            <path
              d="M 476 14 L 490 14 C 508 14, 514 54, 550 54 C 586 54, 592 14, 610 14 L 624 14 L 624 84 L 476 84 Z"
              fill="url(#zenovaCradleGlow)"
            />

            {/* Specular iridescent bubble contour */}
            <path
              d="M 0 14.5 L 490 14.5 C 508 14.5, 514 54, 550 54 C 586 54, 592 14.5, 610 14.5 L 1500 14.5"
              fill="none"
              stroke="url(#zenovaDockShimmer)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* ── Floating 3D Transparent Soap/Glass Bubble Orb ── */}
        <div className="tab-bar__orb-track" aria-hidden="true">
          <div key={activeIndex} className="tab-bar__orb">
            <span className="tab-bar__orb-shimmer" />
            <span className="tab-bar__orb-specular" />
            <span className="tab-bar__orb-caustic" />
            <span className="tab-bar__orb-ring" />
            <span className="tab-bar__orb-icon">{activeTab.icon}</span>
          </div>
        </div>

        {/* ── 5 Interactive Tab Buttons ── */}
        <div className="tab-bar__inner">
          {tabs.map((tab) => {
            const active = isActive(tab.path);
            return (
              <button
                key={tab.path}
                type="button"
                className={`tab-bar__item${active ? ' tab-bar__item--active' : ''}`}
                onClick={() => {
                  haptic('light');
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

export default TabBar;
