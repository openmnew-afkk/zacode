import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/* ===== Точка входа приложения ===== */

// Инициализация Telegram WebApp
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();

  // Отключаем свайп-жест закрытия (iOS)
  if (tg.disableVerticalSwipes) {
    try { tg.disableVerticalSwipes(); } catch {}
  }
  if (tg.setHeaderColor) {
    try { tg.setHeaderColor('#08080f'); } catch {}
  }
  if (tg.setBottomBarColor) {
    try { tg.setBottomBarColor('#08080f'); } catch {}
  }
}

// Применяем сохранённую тему
try {
  const savedTheme = localStorage.getItem('tc_theme');
  const theme = savedTheme ? JSON.parse(savedTheme) : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
} catch {
  document.documentElement.setAttribute('data-theme', 'dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
