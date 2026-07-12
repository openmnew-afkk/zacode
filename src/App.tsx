import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MovieDetailPage from './pages/MovieDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import TabBar from './components/TabBar';
import SplashPage from './components/SplashPage';

/* ===== TeleCinema — App ===== */

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top, 44px)');
    document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom, 0px)');
  }, []);

  const handleSplashDone = () => setShowSplash(false);

  return (
    <div className="app-root" style={{ paddingTop: 'var(--sat)' }}>
      {showSplash && <SplashPage onDone={handleSplashDone} />}

      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/movie/:id" element={<MovieDetailPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>

      <TabBar />
    </div>
  );
}

export default App;