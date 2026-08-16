import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MovieDetailPage from './pages/MovieDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import PremiumPage from './pages/PremiumPage';
import AdminPage from './pages/AdminPage';
import TabBar from './components/TabBar';
import SplashPage from './components/SplashPage';
import { useTelegram } from './hooks/useTelegram';
import { useStore } from './store';

/* ===== КиноЗал — App ===== */

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  const { tg } = useTelegram();
  const { setTelegramUsername } = useStore();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    // Получаем Telegram username для проверки админа
    try {
      const user = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (user?.username) {
        setTelegramUsername(user.username);
      }
    } catch {}
  }, []);

  const handleSplashDone = () => setShowSplash(false);

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
      </Routes>

      <TabBar />
    </div>
  );
}

export default App;