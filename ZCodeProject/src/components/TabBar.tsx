import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './TabBar.css';

/* ===== Нижняя навигация ===== */

interface Tab {
  path: string;
  label: string;
  icon: string;
}

const tabs: Tab[] = [
  { path: '/', label: 'Главная', icon: '🏠' },
  { path: '/search', label: 'Поиск', icon: '🔍' },
  { path: '/favorites', label: 'Избранное', icon: '❤️' },
  { path: '/profile', label: 'Профиль', icon: '👤' },
];

const TabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.path}
          className={`tab-bar__item ${isActive(tab.path) ? 'tab-bar__item--active' : ''}`}
          onClick={() => navigate(tab.path)}
          aria-label={tab.label}
        >
          <span className="tab-bar__icon">{tab.icon}</span>
          <span className="tab-bar__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default TabBar;
