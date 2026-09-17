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
import GlobalMusicBar from './components/GlobalMusicBar';
import AiFab from './components/AiFab';
import { useTelegram } from './hooks/useTelegram';
import { useStore } from './store';
import { useMusicStore } from './store/musicStore';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  const { tg } = useTelegram();
  const { setTelegramUsername } = useStore();
  const { currentTrack } = useMusicStore();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    try {
      const user = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (user?.username) setTelegramUsername(user.username);
    } catch {}
  }, []);

  return (
    <div className="app-root" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {showSplash && <SplashPage onDone={() => setShowSplash(false)} />}

      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/movie/:id" element={<MovieDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/premium" element={<PremiumPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>

      {currentTrack && <GlobalMusicBar />}
      <AiFab />
      <TabBar />
    </div>
  );
}

export default App;