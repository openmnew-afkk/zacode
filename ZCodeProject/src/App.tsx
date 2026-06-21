import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TabBar from './components/TabBar';
import './styles/global.css';

/* ===== Ленивая загрузка страниц ===== */
const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage'));

/* ===== Заглушка загрузки ===== */
const PageLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    color: 'var(--text-secondary)',
    fontSize: '14px',
  }}>
    Загрузка...
  </div>
);

/* ===== Главный компонент приложения ===== */
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/movie/:id" element={<MovieDetailPage />} />
        </Routes>
      </Suspense>
      <TabBar />
    </BrowserRouter>
  );
};

export default App;
