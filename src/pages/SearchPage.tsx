import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMoviesByActor, searchActors, searchMovies, getTrendingMovies } from '../api/catalog';
import { useStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import type { Actor, Movie } from '../types';
import './SearchPage.css';

const QUICK_SEARCHES = [
  'Дюна', 'Оппенгеймер', 'Интерстеллар', 'Гарри Поттер',
  'Одни из нас', 'Во все тяжкие', 'Очень странные дела',
  'Атака титанов', 'Бэтмен', 'Джентльмены', 'Человек-паук',
];

const CURATED_TAGS = [
  { tag: '#новинки2026', label: 'Новинки' },
  { tag: '#топ100', label: 'Топ 100' },
  { tag: '#фантастика', label: 'Фантастика' },
  { tag: '#триллеры', label: 'Триллеры' },
  { tag: '#комедии', label: 'Комедии' },
  { tag: '#боевики', label: 'Боевики' },
  { tag: '#драма', label: 'Драма' },
  { tag: '#аниме', label: 'Аниме' },
  { tag: '#сериалы', label: 'Сериалы' },
  { tag: '#криминал', label: 'Криминал' },
  { tag: '#ужасы', label: 'Ужасы' },
  { tag: '#мультфильмы', label: 'Анимация' },
];

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isMovieBlocked } = useStore();
  const { haptic } = useTelegram();

  const initialPersonId = Number(searchParams.get('person'));
  const [query, setQuery] = useState(searchParams.get('name') || '');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [trendingDefault, setTrendingDefault] = useState<Movie[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [selectedActor, setSelectedActor] = useState<Actor | null>(() =>
    Number.isSafeInteger(initialPersonId) && initialPersonId > 0
      ? { id: initialPersonId, name: searchParams.get('name') || '', profile_path: null, known_for: [] }
      : null
  );
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<'movie' | 'series' | 'actors'>(
    initialPersonId ? 'actors' : 'movie'
  );
  const [searchError, setSearchError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Загружаем популярные фильмы для начального экрана поиска
  useEffect(() => {
    let alive = true;
    getTrendingMovies()
      .then((list) => {
        if (alive) {
          setTrendingDefault(
            list.filter((m) => m.poster_path && !isMovieBlocked(m.id)).slice(0, 12)
          );
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isMovieBlocked]);

  useEffect(() => {
    let active = true;
    if (!query.trim()) {
      setMovies([]);
      setActors([]);
      setSearchError('');
      setLoading(false);
      return () => {
        active = false;
      };
    }
    if (searchType === 'actors' && selectedActor) {
      return () => {
        active = false;
      };
    }
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
            (m) => !isMovieBlocked(m.id) && !(m.kinopoisk_id && isMovieBlocked(m.kinopoisk_id))
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
    }, 340);
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
          setMovies(
            results.filter(
              (m) => !isMovieBlocked(m.id) && !(m.kinopoisk_id && isMovieBlocked(m.kinopoisk_id))
            )
          );
        }
      })
      .catch(() => {
        if (active) setSearchError('Не удалось загрузить фильмы этого актёра.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedActor, isMovieBlocked]);

  const isEmpty =
    !loading &&
    !searchError &&
    (searchType === 'actors' && !selectedActor ? actors.length === 0 : movies.length === 0) &&
    query.trim().length > 0;

  const isInitial = !loading && query.trim().length === 0;

  const chooseActor = (actor: Actor) => {
    haptic('light');
    setSelectedActor(actor);
    setQuery(actor.name);
  };

  const renderPosterGrid = (list: Movie[]) => (
    <div className="sp-grid">
      {list.map((movie) => (
        <article
          key={movie.id}
          className="sp-card"
          onClick={() => {
            haptic('light');
            navigate(`/movie/${movie.id}`);
          }}
        >
          <div className="sp-card__poster-wrap">
            <img
              src={movie.poster_path}
              alt={movie.title}
              loading="lazy"
              decoding="async"
              className="sp-card__poster"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x300?text=?';
              }}
            />
            {movie.vote_average > 0 && (
              <span className="sp-card__rate">★ {movie.vote_average.toFixed(1)}</span>
            )}
          </div>
          <h3 className="sp-card__title">{movie.title}</h3>
          {movie.release_date && (
            <span className="sp-card__year">{movie.release_date.slice(0, 4)}</span>
          )}
        </article>
      ))}
    </div>
  );

  return (
    <div className="search-page page">
      <div className="search-header">
        <span className="search-header__kicker">ZENOVA CATALOG</span>
        <h1 className="search-header__title">Поиск</h1>
      </div>

      {/* ── Минималистичная матовая поисковая строка ── */}
      <div className="search-input-shell">
        <div className="search-input-wrap">
          <span className="search-input-icon" aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
          </span>

          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder={
              searchType === 'actors'
                ? 'Имя актёра или режиссёра…'
                : 'Название фильма, сериала или жанр…'
            }
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
              type="button"
              className="search-clear"
              onClick={() => {
                haptic('light');
                setSelectedActor(null);
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Очистить"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Сегментированный переключатель разделов ── */}
      <div className="search-types">
        {(
          [
            { id: 'movie', label: 'Фильмы' },
            { id: 'series', label: 'Сериалы' },
            { id: 'actors', label: 'Актёры' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`search-type ${searchType === tab.id ? 'active' : ''}`}
            onClick={() => {
              haptic('light');
              setSelectedActor(null);
              setSearchType(tab.id);
              if (tab.id === 'actors') setQuery('');
            }}
            aria-pressed={searchType === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Лаконичная лента подборок ── */}
      {searchType !== 'actors' && (
        <div className="search-tags-scroll">
          {CURATED_TAGS.map((item) => {
            const isActive = query.trim().toLowerCase() === item.tag.toLowerCase();
            return (
              <button
                key={item.tag}
                type="button"
                className={`search-tag-chip ${isActive ? 'active' : ''}`}
                onClick={() => {
                  haptic('light');
                  setQuery(isActive ? '' : item.tag);
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Быстрые запросы и популярное (когда строка пуста) ── */}
      {isInitial && searchType !== 'actors' && (
        <>
          <div className="search-quick">
            <div className="search-quick__head">
              <span className="search-quick__title">Часто ищут</span>
            </div>
            <div className="search-quick__chips">
              {QUICK_SEARCHES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="search-chip"
                  onClick={() => {
                    haptic('light');
                    setQuery(item);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {trendingDefault.length > 0 && (
            <section className="sp-section">
              <div className="sp-section__head">
                <h2 className="sp-section__title">Популярно сейчас</h2>
                <span className="sp-section__count">{trendingDefault.length}</span>
              </div>
              {renderPosterGrid(trendingDefault)}
            </section>
          )}
        </>
      )}

      {/* ── Скелетон загрузки ── */}
      {loading && (
        <div className="sp-section">
          <div className="sp-grid" aria-label="Загрузка">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="sp-skeleton" />
            ))}
          </div>
        </div>
      )}

      {searchError && (
        <div className="search-empty" role="status">
          <p className="search-empty__title">Поиск временно недоступен</p>
          <p className="search-empty__sub">{searchError}</p>
        </div>
      )}

      {/* ── Выбранный актёр ── */}
      {searchType === 'actors' && selectedActor && (
        <div className="search-actor-selected">
          <div className="search-actor-selected__info">
            <span>Фильмография</span>
            <strong>{selectedActor.name}</strong>
          </div>
          <button
            type="button"
            onClick={() => {
              haptic('light');
              setSelectedActor(null);
              setQuery('');
            }}
          >
            Сбросить
          </button>
        </div>
      )}

      {/* ── Список найденных актёров ── */}
      {searchType === 'actors' && !selectedActor && !loading && actors.length > 0 && (
        <div className="search-actors" aria-label="Результаты поиска актёров">
          {actors.map((actor) => (
            <button
              key={actor.id}
              className="search-actor"
              type="button"
              onClick={() => chooseActor(actor)}
            >
              {actor.profile_path ? (
                <img src={actor.profile_path} alt="" loading="lazy" />
              ) : (
                <span className="search-actor__placeholder" aria-hidden="true">
                  {actor.name.slice(0, 1)}
                </span>
              )}
              <span className="search-actor__copy">
                <strong>{actor.name}</strong>
                {actor.known_for.length > 0 && <small>{actor.known_for.join(' · ')}</small>}
              </span>
              <span className="search-actor__arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Результаты поиска в быстрой 3-колоночной сетке ── */}
      {!loading && movies.length > 0 && (
        <section className="sp-section">
          <div className="sp-section__head">
            <h2 className="sp-section__title">
              {selectedActor ? 'Лучшие работы' : 'Результаты поиска'}
            </h2>
            <span className="sp-section__count">{movies.length}</span>
          </div>
          {renderPosterGrid(movies)}
        </section>
      )}

      {isEmpty && (
        <div className="search-empty">
          <div className="search-empty__icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
          </div>
          <p className="search-empty__title">Ничего не найдено</p>
          <p className="search-empty__sub">Попробуйте другое название или выберите подборку выше</p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
