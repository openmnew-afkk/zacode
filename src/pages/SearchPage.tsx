import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMoviesByActor, searchActors, searchMovies } from '../api/catalog';
import { useStore } from '../store';
import type { Actor, Movie } from '../types';
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
  const [searchParams] = useSearchParams();
  const { isMovieBlocked } = useStore();

  const initialPersonId = Number(searchParams.get('person'));
  const [query, setQuery] = useState(searchParams.get('name') || '');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(() =>
    Number.isSafeInteger(initialPersonId) && initialPersonId > 0
      ? { id: initialPersonId, name: searchParams.get('name') || '', profile_path: null, known_for: [] }
      : null
  );
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'movie' | 'series' | 'actors'>(initialPersonId ? 'actors' : 'movie');
  const [searchError, setSearchError] = useState('');
  const [centeredCards, setCenteredCards] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setMovies([]);
      setActors([]);
      setSearchError('');
      setLoading(false);
      return () => { active = false; };
    }
    if (searchType === 'actors' && selectedActor) return () => { active = false; };
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearchError('');
      try {
        if (searchType === 'actors') {
          const results = await searchActors(query.trim());
          if (active) {
            setActors(results);
            setMovies([]);
          }
        } else {
          const res = await searchMovies(query.trim(), 1, searchType);
          if (!res.ok) throw new Error('Film search failed');
          const filtered = (res.results || []).filter(
            m => !isMovieBlocked(m.id) && !(m.kinopoisk_id && isMovieBlocked(m.kinopoisk_id))
          );
          if (active) {
            setMovies(filtered);
            setActors([]);
          }
        }
      } catch {
        if (active) {
          setMovies([]);
          setActors([]);
          setSearchError('Не удалось выполнить поиск. Проверьте соединение и попробуйте ещё раз.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 380);
    return () => {
      active = false;
      clearTimeout(debounceRef.current);
    };
  }, [query, searchType, selectedActor, isMovieBlocked]);

  useEffect(() => {
    if (!selectedActor) return;
    let active = true;
    setLoading(true);
    setSearchError('');
    getMoviesByActor(selectedActor.id)
      .then((results) => {
        if (active) {
          setMovies(results.filter(
            m => !isMovieBlocked(m.id) && !(m.kinopoisk_id && isMovieBlocked(m.kinopoisk_id))
          ));
        }
      })
      .catch(() => {
        if (active) setSearchError('Не удалось загрузить фильмы этого актёра. Попробуйте ещё раз.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [selectedActor, isMovieBlocked]);

  const isEmpty = !loading && !searchError && (searchType === 'actors' && !selectedActor ? actors.length === 0 : movies.length === 0) && query.trim().length > 0;
  const isInitial = !loading && query.trim().length === 0;
  const chooseActor = (actor: Actor) => {
    setCenteredCards({});
    setSelectedActor(actor);
    setQuery(actor.name);
  };

  const updateCenteredCard = (key: string, rail: HTMLDivElement) => {
    const center = rail.getBoundingClientRect().left + rail.clientWidth / 2;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    Array.from(rail.children).forEach((child, index) => {
      const rect = child.getBoundingClientRect();
      const distance = Math.abs(rect.left + rect.width / 2 - center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    setCenteredCards((current) => current[key] === nearestIndex
      ? current
      : { ...current, [key]: nearestIndex });
  };

  const actorShelves = selectedActor ? [
    {
      id: 'rating',
      title: 'Лучшие по рейтингу',
      subtitle: 'Высокие оценки зрителей',
      movies: [...movies].sort((a, b) => b.vote_average - a.vote_average || b.popularity - a.popularity),
    },
    {
      id: 'year',
      title: 'Сначала новинки',
      subtitle: 'Фильмография от новых к ранним',
      movies: [...movies].sort((a, b) =>
        b.release_date.localeCompare(a.release_date) || b.vote_average - a.vote_average
      ),
    },
    {
      id: 'popular',
      title: 'Самые популярные',
      subtitle: 'То, что чаще выбирают зрители',
      movies: [...movies].sort((a, b) => b.popularity - a.popularity || b.vote_average - a.vote_average),
    },
  ] : [];

  const renderMovieCards = (list: Movie[], carouselId: string) => list.map((movie, index) => (
    <button
      key={`${carouselId}-${movie.id}`}
      type="button"
      className={`search-card ${(centeredCards[carouselId] ?? 0) === index ? 'is-centered' : ''}`}
      onClick={() => navigate(`/movie/${movie.id}`)}
      aria-label={`Открыть ${movie.title}${movie.release_date ? `, ${movie.release_date.slice(0, 4)}` : ''}`}
    >
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
      <span className="search-card__title">{movie.title}</span>
      {movie.release_date && <span className="search-card__year">{movie.release_date.slice(0, 4)}</span>}
    </button>
  ));

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
          placeholder={searchType === 'actors' ? 'Имя актёра или актрисы…' : 'Фильм, сериал или хештег #боевик…'}
          value={query}
          onChange={(e) => {
            setSelectedActor(null);
            setQuery(e.target.value);
          }}
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
          onClick={() => { setSelectedActor(null); setSearchType('movie'); }}
          aria-pressed={searchType === 'movie'}
        >
          Фильмы
        </button>
        <button
          className={`search-type ${searchType === 'series' ? 'active' : ''}`}
          onClick={() => { setSelectedActor(null); setSearchType('series'); }}
          aria-pressed={searchType === 'series'}
        >
          Сериалы
        </button>
        <button
          className={`search-type ${searchType === 'actors' ? 'active' : ''}`}
          onClick={() => {
            setSelectedActor(null);
            setSearchType('actors');
            setQuery('');
          }}
          aria-pressed={searchType === 'actors'}
        >
          Актёры
        </button>
      </div>

      {/* ── Горизонтальная лента хештегов для мгновенного подбора ── */}
      {searchType !== 'actors' && <div className="search-tags-scroll">
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
      </div>}

      {searchType !== 'actors' && query.includes('#') && !loading && movies.length > 0 && (
        <div className="search-active-tag">
          <span className="search-active-tag__badge">🏷️ Хештег:</span>
          <span className="search-active-tag__text">{query}</span>
          <span className="search-active-tag__count">Найдено: {movies.length}</span>
        </div>
      )}

      {isInitial && searchType !== 'actors' && (
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
        <div className="search-grid" aria-label="Загрузка фильмов">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="search-skeleton">
              <div className="search-skeleton__poster skeleton-pulse" />
              <div className="search-skeleton__text skeleton-pulse" />
            </div>
          ))}
        </div>
      )}

      {searchError && (
        <div className="search-empty" role="status">
          <p className="search-empty__title">Поиск временно недоступен</p>
          <p className="search-empty__sub">{searchError}</p>
        </div>
      )}

      {searchType === 'actors' && selectedActor && (
        <div className="search-actor-selected">
          <span>Фильмы и сериалы с актёром</span>
          <strong>{selectedActor.name}</strong>
          <button type="button" onClick={() => { setSelectedActor(null); setQuery(''); }}>
            Другой актёр
          </button>
        </div>
      )}

      {searchType === 'actors' && !selectedActor && !loading && actors.length > 0 && (
        <div className="search-actors" aria-label="Результаты поиска актёров">
          {actors.map((actor) => (
            <button key={actor.id} className="search-actor" type="button" onClick={() => chooseActor(actor)}>
              {actor.profile_path ? (
                <img src={actor.profile_path} alt="" loading="lazy" />
              ) : (
                <span className="search-actor__placeholder" aria-hidden="true">{actor.name.slice(0, 1)}</span>
              )}
              <span className="search-actor__copy">
                <strong>{actor.name}</strong>
                {actor.known_for.length > 0 && <small>{actor.known_for.join(' · ')}</small>}
              </span>
              <span className="search-actor__arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      )}

      {!loading && movies.length > 0 && selectedActor && (
        <div className="search-actor-shelves">
          {actorShelves.map((shelf) => (
            <section className="search-actor-shelf" key={shelf.id} aria-label={shelf.title}>
              <div className="search-actor-shelf__heading">
                <div>
                  <h2>{shelf.title}</h2>
                  <p>{shelf.subtitle}</p>
                </div>
                <span>{shelf.movies.length}</span>
              </div>
              <div
                className="search-grid search-grid--centered"
                onScroll={(event) => updateCenteredCard(shelf.id, event.currentTarget)}
              >
                {renderMovieCards(shelf.movies, shelf.id)}
              </div>
            </section>
          ))}
        </div>
      )}

      {!loading && movies.length > 0 && !selectedActor && (
        <div
          className="search-grid search-grid--centered"
          onScroll={(event) => updateCenteredCard('general', event.currentTarget)}
        >
          {renderMovieCards(movies, 'general')}
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