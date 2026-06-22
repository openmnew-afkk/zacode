import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TabBar from './components/TabBar';
import SplashPage from './components/SplashPage';
import './styles/global.css';

/* ===== Ленивая загрузка страниц ===== */
const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage'));

/* ===== Главный компонент приложения ===== */
const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Показываем сплеш 3 секунды, затем плавно убираем
    const timer = setTimeout(() => setShowSplash(false), 3200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <BrowserRouter>
      {showSplash && <SplashPage />}
      <Suspense fallback={<div className="page-loader" />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/movie/:id" element={<MovieDetailPage />} />
        </Routes>
      </Suspense>
      {!showSplash && <TabBar />}
      {/* Небольшой page-loader на время ленивой загрузки */}
      <div id="page-loader-portal" />
    </BrowserRouter>
  );
};

export default App;
