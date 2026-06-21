import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/* ===== Точка входа приложения ===== */

// Инициализация Telegram WebApp
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
}

// Применяем сохранённую тему
try {
  const savedTheme = localStorage.getItem('tc_theme');
  const theme = savedTheme ? JSON.parse(savedTheme) : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
} catch {
  document.documentElement.setAttribute('data-theme', 'dark');
}

// Рендер приложения
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
