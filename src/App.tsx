import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MovieDetailPage from './pages/MovieDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import SportPage from './pages/SportPage';
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

/* Сброс скролла при переходе на другую страницу */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  // Красивая заставка при каждом входе (быстрая, ~1 сек), главная грузится под ней
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { tg } = useTelegram();
  const { setTelegramUsername, applyBackendConfig, theme } = useStore();

  /* Страховка: заставка скрывается максимум через 3.5с, что бы ни случилось */
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 3500);
    return () => clearTimeout(t);
  }, []);

  /* При входе всегда открываем главную (Telegram может вернуть последний URL) */
  useEffect(() => {
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Тема: тёмная (по умолчанию) или неоновая фиолетово-розовая
    if (theme === 'violet') {
      document.documentElement.setAttribute('data-theme', 'violet');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try {
      const bgColor = theme === 'violet' ? '#0e0618' : '#08080f';
      tg?.setHeaderColor?.(bgColor);
      tg?.setBottomBarColor?.(bgColor);
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

  const handleSplashDone = () => setShowSplash(false);

  return (
    <div className="app-root" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {showSplash && <SplashPage onDone={handleSplashDone} />}

      <ScrollToTop />

      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/movie/:id" element={<MovieDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/sport" element={<SportPage />} />
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