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
import { StudiosPage } from './pages/StudiosPage';
import TabBar from './components/TabBar';
import SideMenu from './components/SideMenu';
import SplashPage from './components/SplashPage';
import GlobalMusicBar from './components/GlobalMusicBar';
import MandatorySubModal from './components/MandatorySubModal';
import SeasonFx from './components/SeasonFx';
import NorthernLights from './components/NorthernLights';
import { RulesModal } from './components/RulesModal';
import { useStore } from './store';
import { useMusicStore } from './store/musicStore';
import { getStoredSeason, applySeason } from './services/seasons';
import { enforceTelegramFullscreen } from './hooks/useTelegram';

const RULES_ACCEPTED_KEY = 'zenova_rules_accepted';

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return sessionStorage.getItem('zenova_splash_seen') !== '1';
    } catch {
      return false;
    }
  });
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

  /* ═══ Сезонная тема: новогодняя зимой, сакура весной и т.д. (реактивно) ═══ */
  const [season, setSeason] = useState(() => getStoredSeason().season);
  useEffect(() => {
    applySeason(season);
  }, [season]);

  useEffect(() => {
    const syncSeason = () => setSeason(getStoredSeason().season);
    window.addEventListener('zenova-season-change', syncSeason);
    window.addEventListener('storage', syncSeason);
    return () => {
      window.removeEventListener('zenova-season-change', syncSeason);
      window.removeEventListener('storage', syncSeason);
    };
  }, []);

  /* ═══ Фоновая облачная синхронизация при запуске (0 мс задержки) ═══ */
  useEffect(() => {
    syncCloudState?.().catch(() => {});
  }, [syncCloudState]);

  useEffect(() => {
    syncTrackedCloud().catch((error: unknown) => {
      console.warn('Could not restore watch statuses from Telegram CloudStorage:', error);
    });
  }, [syncTrackedCloud]);

  /* ═══ Гарантированный полноразмерный вид под телефон в Telegram WebApp ═══ */
  useEffect(() => {
    enforceTelegramFullscreen();
  }, [location.pathname]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.key]);

  return (
    <div className="app-root">
      {/* Сезонные эффекты: снегопад с сугробом, лепестки сакуры, листья, светлячки */}
      {season.id !== 'none' && <SeasonFx season={season.id} />}
      <NorthernLights season={season.id} />

      {showSplash && (
        <SplashPage
          onDone={() => {
            try {
              sessionStorage.setItem('zenova_splash_seen', '1');
            } catch {}
            setShowSplash(false);
          }}
        />
      )}
      {/* Соглашение при первом заходе: блокирует использование до принятия */}
      <RulesModal isOpen={rulesGate} onClose={() => {}} mandatory onAccept={acceptRules} />
      <MandatorySubModal />

      <div className={`app-main ${currentTrack ? 'app-main--with-player' : ''}`}>
        <Routes location={location}>
          {/* Всегда главная по умолчанию */}
          <Route path="/" element={<HomePage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/studios" element={<StudiosPage />} />
          <Route path="/studios/:studioId" element={<StudiosPage />} />
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

      {/* Боковое выезжающее меню (разделы, Кино-Миры, сезоны) */}
      <SideMenu />

      {/* Глобальная музыкальная панель над TabBar */}
      {currentTrack && <GlobalMusicBar />}

      <TabBar />
    </div>
  );
}

export default App;