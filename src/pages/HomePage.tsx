import React, { useState, useEffect } from 'react';
import { SearchBar } from '../components/SearchBar';
import { MovieGrid } from '../components/MovieGrid';
import { getTrendingMovies } from '../api/omdb';
import { useStore } from '../store';
import type { Movie } from '../types';

export const HomePage: React.FC = () => {
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const { history, favorites } = useStore();

  useEffect(() => {
    const loadTrending = async () => {
      try {
        setLoading(true);
        const movies = await getTrendingMovies();
        setTrendingMovies(movies);
      } catch (error) {
        console.error('Failed to load trending:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrending();
  }, []);

  const handleSearch = (movies: Movie[]) => {
    setSearchResults(movies);
    setHasSearched(true);
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-50 glass-lg border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            🎬 TeleCinema
          </h1>
          <SearchBar onSearch={handleSearch} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {hasSearched ? (
          <MovieGrid
            movies={searchResults}
            title={`Результаты поиска (${searchResults.length})`}
            loading={false}
          />
        ) : (
          <>
            {favorites.length > 0 && (
              <div className="mb-12">
                <MovieGrid
                  movies={favorites}
                  title={`❤️ Мои избранные (${favorites.length})`}
                />
              </div>
            )}

            {history.length > 0 && (
              <div className="mb-12">
                <MovieGrid
                  movies={history.slice(0, 12)}
                  title={`📺 Смотрел недавно (${history.length})`}
                />
              </div>
            )}

            <div className="mb-12">
              <MovieGrid
                movies={trendingMovies}
                title="🔥 Популярные"
                loading={loading}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
};
