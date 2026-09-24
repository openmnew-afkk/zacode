import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MovieDetailPage from './pages/MovieDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import PremiumPage from './pages/PremiumPage';
import AdminPage from './pages/AdminPage';
import MusicPage from './pages/MusicPage';
import AiPickPage from './pages/AiPickPage';
import RulesPage from './pages/RulesPage';
import FeedPage from './pages/FeedPage';
import TabBar from './components/TabBar';
import SplashPage from './components/SplashPage';
import GlobalMusicBar from './components/GlobalMusicBar';
import { useStore } from './store';
import { useMusicStore } from './store/musicStore';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTelegramUsername } = useStore();
  const { currentTrack } = useMusicStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    try {
      const user = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
      if (user?.username) setTelegramUsername(user.username);
    } catch {}
  }, [theme, setTelegramUsername]);

  /* ═══ При каждом входе — всегда главная (Telegram восстанавливает последний URL) ═══ */
  useEffect(() => {
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app-root">
      {showSplash && <SplashPage onDone={() => setShowSplash(false)} />}

      <div className={`app-main ${currentTrack ? 'app-main--with-player' : ''}`}>
        <Routes location={location}>
          {/* Всегда главная по умолчанию */}
          <Route path="/" element={<HomePage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/movie/:id" element={<MovieDetailPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/music" element={<MusicPage />} />
          <Route path="/ai" element={<AiPickPage />} />
          <Route path="/premium" element={<PremiumPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/admin" element={<AdminPage />} />
          {/* Любой неизвестный путь → главная */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Глобальная музыкальная панель над TabBar */}
      {currentTrack && <GlobalMusicBar />}

      <TabBar />
    </div>
  );
}

export default App;