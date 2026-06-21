import React, { useState, useEffect, useCallback, useRef } from 'react';
import SearchBar from '../components/SearchBar';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { searchMovies, discoverMovies, getGenres } from '../api/tmdb';
import type { Movie, Genre } from '../types';
import './SearchPage.css';

/* ===== Страница поиска ===== */

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  /** Загрузка жанров */
  useEffect(() => {
    getGenres().then(setGenres).catch(console.error);
  }, []);

  /** Загрузка фильмов */
  const fetchMovies = useCallback(
    async (pageNum: number, reset = false) => {
      setLoading(true);
      try {
        let result;
        if (query.trim()) {
          result = await searchMovies(query.trim(), pageNum);
        } else {
          result = await discoverMovies({
            page: pageNum,
            with_genres: selectedGenres.length > 0 ? selectedGenres.join(',') : undefined,
            primary_release_year: selectedYear || undefined,
          });
        }
        setMovies((prev) => (reset ? result.results : [...prev, ...result.results]));
        setTotalPages(result.total_pages);
      } catch (err) {
        console.error('Ошибка поиска:', err);
      } finally {
        setLoading(false);
      }
    },
    [query, selectedGenres, selectedYear]
  );

  /** Поиск с debounce */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setMovies([]);
      fetchMovies(1, true);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, selectedGenres, selectedYear, fetchMovies]);

  /** Бесконечный скролл */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && page < totalPages) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchMovies(nextPage);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [loading, page, totalPages, fetchMovies]);

  /** Переключение жанра */
  const toggleGenre = (genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((g) => g !== genreId)
        : [...prev, genreId]
    );
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="search-page">
      <h1 className="search-page__title">Поиск</h1>
      <SearchBar value={query} onChange={setQuery} />

      {/* Фильтр по жанрам */}
      <div className="search-filters">
        <div className="search-filters__genres">
          {genres.map((genre) => (
            <button
              key={genre.id}
              className={`genre-chip ${selectedGenres.includes(genre.id) ? 'genre-chip--active' : ''}`}
              onClick={() => toggleGenre(genre.id)}
            >
              {genre.name}
            </button>
          ))}
        </div>

        {/* Фильтр по году */}
        <div className="search-filters__year">
          <label className="year-label">
            Год: {selectedYear || 'Любой'}
          </label>
          <input
            type="range"
            min="1990"
            max={currentYear}
            value={selectedYear || currentYear}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setSelectedYear(val === currentYear ? 0 : val);
            }}
            className="year-slider"
          />
        </div>
      </div>

      {/* Результаты */}
      <div className="search-results">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} variant="grid" />
        ))}
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={`sk-${i}`} variant="wide" />
          ))}
      </div>

      {/* Триггер бесконечного скролла */}
      <div ref={observerRef} className="search-observer" />

      {/* Пустые результаты */}
      {!loading && movies.length === 0 && (
        <div className="search-empty">
          <span className="search-empty__icon">🎬</span>
          <p>Начните вводить название фильма</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
