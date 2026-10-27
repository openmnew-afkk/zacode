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
import NewYearPage from './pages/NewYearPage';
import HalloweenPage from './pages/HalloweenPage';
import TabBar from './components/TabBar';
import SplashPage from './components/SplashPage';
import GlobalMusicBar from './components/GlobalMusicBar';
import MandatorySubModal from './components/MandatorySubModal';
import SeasonFx from './components/SeasonFx';
import { RulesModal } from './components/RulesModal';
import { useStore } from './store';
import { useMusicStore } from './store/musicStore';
import { getStoredSeason, applySeason } from './services/seasons';

const RULES_ACCEPTED_KEY = 'zenova_rules_accepted';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTelegramUsername, syncCloudState, syncTrackedCloud } = useStore();
  const { currentTrack } = useMusicStore();

  /* ═══ Пользовательское соглашение: обязательное при первом запуске ═══ */
  const [rulesGate, setRulesGate] = useState(() => {
    try { return localStorage.getItem(RULES_ACCEPTED_KEY) !== '1'; } catch { return true; }
  });
  const acceptRules = () => {
    try { localStorage.setItem(RULES_ACCEPTED_KEY, '1'); } catch {}
    setRulesGate(false);
  };

  /* ═══ Сезонная тема: новогодняя зимой, сакура весной и т.д. ═══ */
  const season = getStoredSeason().season;
  useEffect(() => {
    applySeason(season);
  }, [season.id]);

  /* ═══ Фоновая облачная синхронизация при запуске (0 мс задержки) ═══ */
  useEffect(() => {
    syncCloudState?.().catch(() => {});
  }, [syncCloudState]);

  useEffect(() => {
    syncTrackedCloud().catch((error: unknown) => {
      console.warn('Could not restore watch statuses from Telegram CloudStorage:', error);
    });
  }, [syncTrackedCloud]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        const bgCol = theme === 'light' ? '#fff5f7' : '#09080b';
        if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor(bgCol);
        if (typeof tg.setBottomBarColor === 'function') tg.setBottomBarColor(bgCol);
      }
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
      {/* Сезонные эффекты: снегопад с сугробом, лепестки сакуры, листья, светлячки */}
      {season.id !== 'none' && <SeasonFx season={season.id} />}

      {showSplash && <SplashPage onDone={() => setShowSplash(false)} />}
      {/* Соглашение при первом заходе: блокирует использование до принятия */}
      <RulesModal isOpen={rulesGate} onClose={() => {}} mandatory onAccept={acceptRules} />
      <MandatorySubModal />

      <div className={`app-main ${currentTrack ? 'app-main--with-player' : ''}`}>
        <Routes location={location}>
          {/* Всегда главная по умолчанию */}
          <Route path="/" element={<HomePage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/new-year" element={<NewYearPage />} />
          <Route path="/halloween" element={<HalloweenPage />} />
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