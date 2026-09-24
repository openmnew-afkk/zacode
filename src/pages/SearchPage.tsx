import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMovies } from '../api/catalog';
import { useTelegram } from '../hooks/useTelegram';
import { checkRussianAccess } from '../services/accessControl';
import type { Movie } from '../types';
import './SearchPage.css';

const QUICK_SEARCHES = [
  'Дюна', 'Оппенгеймер', 'Интерстеллар', 'Гарри Поттер',
  'Одни из нас', 'Во все тяжкие', 'Очень странные дела',
  'Атака титанов', 'Бэтмен', 'Джентльмены', 'Человек-паук',
];

const HASHTAG_CHIPS = [
  { tag: '#новинки2026', label: '#новинки2026', emoji: '⚡' },
  { tag: '#боевики', label: '#боевики', emoji: '💥' },
  { tag: '#комедии', label: '#комедии', emoji: '😂' },
  { tag: '#фантастика', label: '#фантастика', emoji: '🚀' },
  { tag: '#триллеры', label: '#триллеры', emoji: '🔪' },
  { tag: '#ужасы', label: '#ужасы', emoji: '👻' },
  { tag: '#аниме', label: '#аниме', emoji: '⚔️' },
  { tag: '#сериалы', label: '#сериалы', emoji: '📺' },
  { tag: '#топ100', label: '#топ100', emoji: '⭐' },
  { tag: '#криминал', label: '#криминал', emoji: '🕵️' },
  { tag: '#драма', label: '#драма', emoji: '🎭' },
  { tag: '#мультфильмы', label: '#мультфильмы', emoji: '🎈' },
];

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: tgUser } = useTelegram();
  const hasRussianAccess = checkRussianAccess(tgUser?.username);
  const isRus = (m?: Movie | null) =>
    Boolean(
      m?.is_russian ||
      (m?.id && String(m.id).startsWith('rus-')) ||
      (m?.countries && m.countries.some((c) => /россия|russia|ссср|ussr/i.test(c)))
    );

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
        const filtered = hasRussianAccess ? res.results : res.results.filter(m => !isRus(m));
        setMovies(filtered);
      } catch { setMovies([]); }
      setLoading(false);
    }, 380);
    return () => clearTimeout(debounceRef.current);
  }, [query, searchType, hasRussianAccess]);

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
          placeholder="Фильм, сериал, или хештег #боевик #2026…"
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

      {/* ── Горизонтальная лента хештегов для мгновенного подбора ── */}
      <div className="search-tags-scroll">
        {HASHTAG_CHIPS.map((item) => {
          const isActive = query.trim().toLowerCase() === item.tag.toLowerCase();
          return (
            <button
              key={item.tag}
              className={`search-tag-chip ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (isActive) {
                  setQuery('');
                } else {
                  setQuery(item.tag);
                }
              }}
            >
              <span className="search-tag-chip__emoji">{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {query.includes('#') && !loading && movies.length > 0 && (
        <div className="search-active-tag">
          <span className="search-active-tag__badge">🏷️ Хештег:</span>
          <span className="search-active-tag__text">{query}</span>
          <span className="search-active-tag__count">Найдено: {movies.length}</span>
        </div>
      )}

      {isInitial && (
        <div className="search-quick">
          <div className="search-quick__title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#f43f5e', marginRight: 6 }}>
              <path d="M12 22c-4.4 0-7.5-3-7.5-7.2 0-2.6 1.3-4.6 2.6-6.2.6-.8 1.9-.4 2 .7.1.9.4 1.7 1 2.3.3-3.5 2-6.9 5.3-8.8.9-.5 2 .2 1.9 1.2-.1 1.6.2 3.5 1.6 5.7 1.1 1.7 2.6 3.4 2.6 5.6C21.5 19 18.4 22 12 22z" />
            </svg>
            Популярные запросы
          </div>
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
          <div className="search-empty__icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
          </div>
          <p className="search-empty__title">Ничего не найдено</p>
          <p className="search-empty__sub">Попробуйте изменить формулировку или ввести другое название</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;