import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import TabBar from './components/TabBar';
import SplashPage from './components/SplashPage';
import './styles/global.css';

/* ===== Ленивая загрузка страниц ===== */
const HomePage      = lazy(() => import('./pages/HomePage'));
const SearchPage    = lazy(() => import('./pages/SearchPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const ProfilePage   = lazy(() => import('./pages/ProfilePage'));
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage'));

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <HashRouter>
      {showSplash && <SplashPage />}
      <Suspense fallback={<div className="page-loader" />}>
        <Routes>
          <Route path="/"         element={<HomePage />} />
          <Route path="/search"   element={<SearchPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/profile"  element={<ProfilePage />} />
          <Route path="/movie/:id" element={<MovieDetailPage />} />
        </Routes>
      </Suspense>
      {!showSplash && <TabBar />}
    </HashRouter>
  );
};

export default App;
