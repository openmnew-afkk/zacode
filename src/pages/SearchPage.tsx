import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMovies } from '../api/catalog';
import type { Movie } from '../types';
import './SearchPage.css';

const QUICK_SEARCHES = [
  'Дюна', 'Оппенгеймер', 'Интерстеллар', 'Гарри Поттер',
  'Одни из нас', 'Во все тяжкие', 'Очень странные дела',
  'Атака титанов', 'Бэтмен', 'Джентльмены', 'Человек-паук',
];

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'movie' | 'series'>('movie');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!query.trim()) { setMovies([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchMovies(query.trim(), 1, searchType);
        setMovies(res.results);
      } catch { setMovies([]); }
      setLoading(false);
    }, 380);
    return () => clearTimeout(debounceRef.current);
  }, [query, searchType]);

  const isEmpty = !loading && movies.length === 0 && query.trim().length > 0;
  const isInitial = !loading && query.trim().length === 0;

  return (
    <div className="search-page page">
      <div className="search-header">
        <h1 className="search-header__title">Поиск</h1>
        <span className="search-header__sub">Тысячи фильмов и сериалов в одном месте</span>
      </div>

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
          placeholder="Фильм, сериал, мультфильм…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            aria-label="Очистить"
          >
            ✕
          </button>
        )}
      </div>

      <div className="search-types">
        <button
          className={`search-type ${searchType === 'movie' ? 'active' : ''}`}
          onClick={() => setSearchType('movie')}
        >
          Фильмы
        </button>
        <button
          className={`search-type ${searchType === 'series' ? 'active' : ''}`}
          onClick={() => setSearchType('series')}
        >
          Сериалы
        </button>
      </div>

      {isInitial && (
        <div className="search-quick">
          <div className="search-quick__title">🔥 Часто ищут</div>
          <div className="search-quick__chips">
            {QUICK_SEARCHES.map((item) => (
              <button
                key={item}
                className="search-chip"
                onClick={() => {
                  setQuery(item);
                  inputRef.current?.focus();
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="search-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="search-skeleton">
              <div className="search-skeleton__poster skeleton-pulse" />
              <div className="search-skeleton__text skeleton-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && movies.length > 0 && (
        <div className="search-grid">
          {movies.map((movie) => (
            <div key={movie.id} className="search-card" onClick={() => navigate(`/movie/${movie.id}`)}>
              <div className="search-card__poster">
                <img
                  src={movie.poster_path}
                  alt={movie.title}
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x300?text=?'; }}
                />
                <div className="search-card__fade" />
                {movie.vote_average > 0 && (
                  <span className="search-card__rating">★ {movie.vote_average.toFixed(1)}</span>
                )}
              </div>
              <p className="search-card__title">{movie.title}</p>
              {movie.release_date && <p className="search-card__year">{movie.release_date.slice(0, 4)}</p>}
            </div>
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="search-empty">
          <div className="search-empty__icon-wrap">🔍</div>
          <p className="search-empty__title">Ничего не найдено</p>
          <p className="search-empty__sub">Попробуйте изменить формулировку или ввести другое название</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;