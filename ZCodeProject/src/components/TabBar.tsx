import React, { useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import './TabBar.css';

/* ===== Новая нижняя навигация с анимированным pill ===== */

interface Tab {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const HomeIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" />
  </svg>
);
const SearchIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const HeartIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);
const UserIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </svg>
);

const tabs: Tab[] = [
  { path: '/', label: 'Главная', icon: HomeIcon },
  { path: '/search', label: 'Поиск', icon: SearchIcon },
  { path: '/favorites', label: 'Избранное', icon: HeartIcon },
  { path: '/profile', label: 'Профиль', icon: UserIcon },
];

const TabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites } = useStore();
  const innerRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const activeIndex = tabs.findIndex((t) => isActive(t.path));

  /** Пересчитываем позицию pill */
  useEffect(() => {
    if (!innerRef.current) return;
    const items = innerRef.current.querySelectorAll<HTMLButtonElement>('.tab-bar__item');
    const active = items[activeIndex];
    if (active) {
      const parentRect = innerRef.current.getBoundingClientRect();
      const rect = active.getBoundingClientRect();
      setPillStyle({
        left: rect.left - parentRect.left,
        width: rect.width,
      });
    }
  }, [activeIndex, location.pathname]);

  return (
    <nav className="tab-bar" role="navigation" aria-label="Навигация">
      <div className="tab-bar__inner" ref={innerRef}>
        {/* Плавающий pill */}
        <div
          className="tab-bar__pill"
          style={{ left: pillStyle.left, width: pillStyle.width }}
        />

        {tabs.map((tab, i) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              className={`tab-bar__item ${active ? 'tab-bar__item--active' : ''}`}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="tab-bar__icon">{tab.icon}</span>
              <span className="tab-bar__label">{tab.label}</span>

              {/* Бейдж для избранного */}
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
