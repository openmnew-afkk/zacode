import React, { useState, useEffect, useCallback, useRef } from 'react';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { searchCatalog, getCatalog, getGenres } from '../api/catalog';
import type { Movie, Genre } from '../types';
import './SearchPage.css';

/* ===== ULTRA PREMIUM — Страница поиска ===== */

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'movie' | 'series'>('movie');
  const observerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getGenres().then(setGenres).catch(console.error);
  }, []);

  const fetchMovies = useCallback(
    async (pageNum: number, reset = false) => {
      setLoading(true);
      try {
        let result;
        const genre = selectedGenres.length > 0 ? String(selectedGenres[0]) : undefined;
        const year = selectedYear ? String(selectedYear) : undefined;
        if (query.trim()) {
          result = await searchCatalog(query.trim(), pageNum, searchType);
        } else {
          result = await getCatalog({ page: pageNum, genre, year, sort: 'year' });
        }
        setMovies((prev) => (reset ? result.results : [...prev, ...result.results]));
        setTotalPages(result.total_pages);
      } catch (err) {
        console.error('Ошибка поиска:', err);
        setError('Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    },
    [query, selectedGenres, selectedYear, searchType]
  );

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setMovies([]);
      fetchMovies(1, true);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, selectedGenres, selectedYear, fetchMovies]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && page < totalPages) {
          const next = page + 1;
          setPage(next);
          fetchMovies(next);
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [loading, page, totalPages, fetchMovies]);

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    );
  };

  const currentYear = new Date().getFullYear();
  const isEmpty = !loading && movies.length === 0;

  return (
    <div className="search-page page">
      {/* ── Header ── */}
      <div className="search-page__header">
        <h1 className="search-page__title">Поиск</h1>
        <p className="search-page__sub">Найдите любой фильм или сериал</p>
      </div>

      {/* ── Search input ── */}
      <div className="search-input-wrap">
        <span className="search-input-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
        </span>
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="Название фильма, сериала…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button className="search-clear-btn" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
            ✕
          </button>
        )}
      </div>

      {/* ── Type toggle ── */}
      <div className="search-type-toggle">
        <button
          className={`search-type-btn${searchType === 'movie' ? ' search-type-btn--active' : ''}`}
          onClick={() => setSearchType('movie')}
        >
          🎬 Фильмы
        </button>
        <button
          className={`search-type-btn${searchType === 'series' ? ' search-type-btn--active' : ''}`}
          onClick={() => setSearchType('series')}
        >
          📺 Сериалы
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="search-filters">
        {genres.length > 0 && (
          <>
            <p className="search-filters__label">Жанры</p>
            <div className="search-filters__genres">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  className={`genre-chip${selectedGenres.includes(genre.id) ? ' genre-chip--active' : ''}`}
                  onClick={() => toggleGenre(genre.id)}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="search-filters__year">
          <div className="year-label">
            Год выпуска <span>{selectedYear || 'Любой'}</span>
          </div>
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

      {/* ── Results ── */}
      <div className="search-results">
        {movies.map((movie) => (
          <MovieCard key={`${movie.id}-${movie.kinopoisk_id}`} movie={movie} variant="grid" />
        ))}
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={`sk-${i}`} variant="wide" />
          ))}
      </div>

      <div ref={observerRef} className="search-observer" />

      {/* ── Empty ── */}
      {isEmpty && (
        <div className="search-empty">
          <span className="search-empty__icon">🎬</span>
          <p className="search-empty__title">
            {query ? 'Ничего не найдено' : 'Найдите кино'}
          </p>
          <p className="search-empty__sub">
            {query
              ? `По запросу «${query}» ничего не нашлось`
              : 'Введите название фильма или сериала'}
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="search-empty">
          <span className="search-empty__icon">⚠️</span>
          <p className="search-empty__title">Ошибка</p>
          <p className="search-empty__sub">{error}</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
