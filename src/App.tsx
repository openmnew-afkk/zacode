import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MovieDetailPage from './pages/MovieDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import PremiumPage from './pages/PremiumPage';
import AdminPage from './pages/AdminPage';
import AiPickPage from './pages/AiPickPage';
import TabBar from './components/TabBar';
import AiFab from './components/AiFab';
import SplashPage from './components/SplashPage';
import { useTelegram } from './hooks/useTelegram';
import { useStore } from './store';
import { fetchConfig } from './api/backend';

/* ===== КиноЗал — App ===== */

function App() {
  // Сплэш показываем ОДИН РАЗ за всё время (первый запуск) — дальше сразу главная
  const [showSplash, setShowSplash] = useState(() => {
    try { return localStorage.getItem('tc_splash_seen') !== '1'; } catch { return false; }
  });
  const location = useLocation();
  const { tg } = useTelegram();
  const { setTelegramUsername, applyBackendConfig, theme } = useStore();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    // Светлая/тёмная тема
    document.documentElement.setAttribute('data-theme', theme);
    try {
      tg?.setHeaderColor?.(theme === 'light' ? '#f4f2ee' : '#08080f');
      tg?.setBottomBarColor?.(theme === 'light' ? '#f4f2ee' : '#08080f');
    } catch {}
    // Получаем Telegram username для проверки админа
    let myName = '';
    try {
      const user = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (user?.username) {
        setTelegramUsername(user.username);
        myName = user.username;
      } else if (user?.first_name) {
        myName = user.first_name;
      }
    } catch {}

    // Центральный конфиг с мини-бэкенда (реклама, объявления, премия, реквизиты)
    fetchConfig().then((cfg) => {
      if (cfg) applyBackendConfig(cfg, myName);
    });
  }, [theme]);

  const handleSplashDone = () => {
    try { localStorage.setItem('tc_splash_seen', '1'); } catch {}
    setShowSplash(false);
  };

  return (
    <div className="app-root" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {showSplash && <SplashPage onDone={handleSplashDone} />}

      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/movie/:id" element={<MovieDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/premium" element={<PremiumPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/ai" element={<AiPickPage />} />
      </Routes>

      <TabBar />
      <AiFab />
    </div>
  );
}

export default App;