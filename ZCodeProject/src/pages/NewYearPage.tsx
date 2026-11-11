import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKeywordCollection, CURATED_WINTER_MOVIES } from '../api/catalog';
import type { Movie } from '../types';
import { useTelegram } from '../hooks/useTelegram';
import './NewYearPage.css';

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  celebrating: boolean;
}

function getCountdown(): Countdown {
  const now = new Date();
  const celebrating = now.getMonth() === 0 && now.getDate() === 1;
  const target = new Date(now.getFullYear() + 1, 0, 1);
  const remaining = celebrating ? 0 : Math.max(0, target.getTime() - now.getTime());
  const seconds = Math.floor(remaining / 1000);

  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600) % 24,
    minutes: Math.floor(seconds / 60) % 60,
    seconds: seconds % 60,
    celebrating,
  };
}

const HOLIDAY_MOODS = [
  { id: 'all', label: 'Вся коллекция' },
  { id: 'family', label: 'Семейное', genre: 10751 },
  { id: 'comedy', label: 'Комедии', genre: 35 },
  { id: 'fantasy', label: 'Фэнтези', genre: 14 },
  { id: 'romance', label: 'Романтика', genre: 10749 },
];

const NewYearPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [countdown, setCountdown] = useState(getCountdown);

  const [movies, setMovies] = useState<Movie[]>(CURATED_WINTER_MOVIES);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(2);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeMood, setActiveMood] = useState('all');

  const [roulettePick, setRoulettePick] = useState<Movie | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdown()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    const loadHolidayCatalog = async () => {
      try {
        const [kw1, kw2] = await Promise.all([
          getKeywordCollection('christmas', 1),
          getKeywordCollection('christmas', 2),
        ]);
        const combined = [...CURATED_WINTER_MOVIES, ...(kw1 || []), ...(kw2 || [])];
        const seen = new Set<string>();
        const unique = combined.filter((m) => {
          if (!m.poster_path || seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        if (alive && unique.length > 0) {
          setMovies(unique);
          setPage(2);
        }
      } catch {
        if (alive) setMovies(CURATED_WINTER_MOVIES);
      } finally {
        if (alive) setLoading(false);
      }
    };
    loadHolidayCatalog();
    return () => {
      alive = false;
    };
  }, []);

  const filteredMovies = useMemo(() => {
    const moodObj = HOLIDAY_MOODS.find((m) => m.id === activeMood);
    if (!moodObj || !moodObj.genre) return movies;
    const byGenre = movies.filter((m) => m.genre_ids?.includes(moodObj.genre!));
    return byGenre.length >= 4 ? byGenre : movies;
  }, [movies, activeMood]);

  const spinHolidayRoulette = () => {
    if (spinning || movies.length === 0) return;
    haptic('medium');
    setSpinning(true);
    setTimeout(() => {
      const pool = movies.filter((m) => (m.vote_average || 0) >= 6.0);
      const source = pool.length > 0 ? pool : movies;
      const randomMovie = source[Math.floor(Math.random() * source.length)];
      setRoulettePick(randomMovie);
      setSpinning(false);
    }, 520);
  };

  const loadMoreHoliday = async () => {
    if (loadingMore) return;
    haptic('light');
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const more = await getKeywordCollection('207317|65|193122', nextPage);
      if (more && more.length > 0) {
        setMovies((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          return [...prev, ...more.filter((m) => m.poster_path && !ids.has(m.id))];
        });
        setPage(nextPage);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <main className="ny-page page">
      <div className="ny-ambient" aria-hidden="true" />

      {/* ── Минималистичная шапка ── */}
      <header className="ny-header">
        <button className="ny-back" type="button" onClick={() => navigate(-1)} aria-label="Назад">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Назад</span>
        </button>
        <span className="ny-header__kicker">WINTER COLLECTION</span>
      </header>

      {/* ── Эстетичная минималистичная карточка марафона ── */}
      <section className="ny-hero-card" aria-labelledby="ny-title">
        <div className="ny-hero-top">
          <div className="ny-hero__copy">
            <span className="ny-eyebrow">ЗИМНИЙ СЕЗОН · ZENOVA</span>
            <h1 id="ny-title">
              {countdown.celebrating ? 'С Новым годом' : 'Зимний киномарафон'}
            </h1>
            <p>
              Избранная коллекция атмосферного зимнего и праздничного кино для уютного вечера.
            </p>
          </div>

          <div className="ny-mascot-minimal">
            <img
              src="./zenova-mask-winter.png"
              alt=""
              className="ny-mascot-img"
              draggable={false}
            />
          </div>
        </div>

        {/* Сдержанный стеклянный таймер */}
        <div className="ny-countdown" aria-label="До Нового года">
          {[
            { label: 'дней', value: countdown.days },
            { label: 'часов', value: countdown.hours },
            { label: 'минут', value: countdown.minutes },
            { label: 'секунд', value: countdown.seconds, accent: true },
          ].map((unit) => (
            <div className={`ny-time ${unit.accent ? 'ny-time--accent' : ''}`} key={unit.label}>
              <strong>{String(unit.value).padStart(2, '0')}</strong>
              <span>{unit.label}</span>
            </div>
          ))}
        </div>

        {/* Лаконичные кнопки */}
        <div className="ny-hero-btns">
          <button
            type="button"
            className="ny-btn ny-btn--primary"
            onClick={spinHolidayRoulette}
          >
            <span>{spinning ? 'Подбираем фильм…' : 'Случайный фильм на вечер'}</span>
          </button>

          <button
            type="button"
            className="ny-btn ny-btn--secondary"
            onClick={() => {
              haptic('light');
              navigate('/music');
            }}
          >
            <span>Атмосферная музыка</span>
          </button>
        </div>
      </section>

      {/* ── Карточка выпавшего фильма ── */}
      {roulettePick && (
        <section className="ny-roulette-result">
          <div className="ny-roulette-card" onClick={() => navigate(`/movie/${roulettePick.id}`)}>
            <img
              src={roulettePick.poster_path}
              alt={roulettePick.title}
              className="ny-roulette-card__poster"
            />
            <div className="ny-roulette-card__body">
              <div className="ny-roulette-card__top">
                <span className="ny-roulette-card__kicker">ВЫБОР НА ВЕЧЕР</span>
                {roulettePick.vote_average > 0 && (
                  <span className="ny-roulette-card__rate">★ {roulettePick.vote_average.toFixed(1)}</span>
                )}
              </div>
              <h3 className="ny-roulette-card__title">{roulettePick.title}</h3>
              {roulettePick.overview && (
                <p className="ny-roulette-card__desc">{roulettePick.overview}</p>
              )}
              <div className="ny-roulette-card__actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="ny-roulette-card__play"
                  onClick={() => navigate(`/movie/${roulettePick.id}`)}
                >
                  Смотреть
                </button>
                <button
                  type="button"
                  className="ny-roulette-card__again"
                  onClick={spinHolidayRoulette}
                >
                  Другой вариант
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Каталог фильмов ── */}
      <section className="ny-catalog-section">
        <div className="ny-section-head">
          <h2 className="ny-section-title">Подборка фильмов</h2>
          <span className="ny-section-count">{filteredMovies.length}</span>
        </div>

        <div className="ny-mood-bar">
          {HOLIDAY_MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`ny-mood-pill ${activeMood === m.id ? 'active' : ''}`}
              onClick={() => {
                haptic('light');
                setActiveMood(m.id);
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="ny-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="ny-card-skeleton" />
            ))}
          </div>
        ) : (
          <>
            <div className="ny-grid">
              {filteredMovies.map((movie) => (
                <article
                  key={movie.id}
                  className="ny-movie-card"
                  onClick={() => {
                    haptic('light');
                    navigate(`/movie/${movie.id}`);
                  }}
                >
                  <div className="ny-movie-card__poster-wrap">
                    <img
                      src={movie.poster_path}
                      alt={movie.title}
                      loading="lazy"
                      className="ny-movie-card__poster"
                    />
                    {movie.vote_average > 0 && (
                      <span className="ny-movie-card__rate">★ {movie.vote_average.toFixed(1)}</span>
                    )}
                  </div>
                  <h3 className="ny-movie-card__title">{movie.title}</h3>
                  {movie.release_date && (
                    <span className="ny-movie-card__year">{movie.release_date.slice(0, 4)}</span>
                  )}
                </article>
              ))}
            </div>

            <div className="ny-more-wrap">
              <button
                type="button"
                className="ny-more-btn"
                onClick={loadMoreHoliday}
                disabled={loadingMore}
              >
                {loadingMore ? 'Загрузка…' : 'Загрузить ещё'}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
};

export default NewYearPage;
