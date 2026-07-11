import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { HomePage } from './pages/HomePage';
import { MoviePage } from './pages/MoviePage';
import { FavoritesPage } from './pages/FavoritesPage';

function App() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Ensure dark mode is always on
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  }, []);

  return (
    <div className="bg-dark-900 text-white min-h-screen">
      <Navigation />
      <main className="md:ml-64">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/movie/:id" element={<MoviePage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
