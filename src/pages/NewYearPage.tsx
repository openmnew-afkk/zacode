import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKeywordCollection, discoverMovies } from '../api/catalog';
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
  { id: 'all', label: '✨ Весь марафон', icon: '🎄' },
  { id: 'family', label: '🎅 Семейное чудо', genre: 10751 },
  { id: 'comedy', label: '🥂 Новогодняя комедия', genre: 35 },
  { id: 'fantasy', label: '❄️ Зимняя сказка', genre: 14 },
  { id: 'romance', label: '💝 Уют и романтика', genre: 10749 },
];

const NewYearPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const [countdown, setCountdown] = useState(getCountdown);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeMood, setActiveMood] = useState('all');

  /* Новогодняя рулетка фильма на вечер */
  const [roulettePick, setRoulettePick] = useState<Movie | null>(null);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdown()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const loadHolidayCatalog = async () => {
      try {
        const [kw1, kw2] = await Promise.all([
          getKeywordCollection('207317|65|193122', 1),
          getKeywordCollection('207317|65|193122', 2),
        ]);
        let combined = [...(kw1 || []), ...(kw2 || [])];
        if (combined.length < 10) {
          const fallback = await discoverMovies({ page: 1, with_genres: '10751,14' });
          combined = [...combined, ...(fallback.results || [])];
        }
        const seen = new Set<string>();
        const unique = combined.filter((m) => {
          if (!m.poster_path || seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        if (alive) {
          setMovies(unique);
          setPage(2);
        }
      } catch {
        if (alive) setMovies([]);
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
    }, 650);
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
      {/* Северное сияние и падающий снег */}
      <div className="ny-aurora-bg" aria-hidden="true">
        <span className="ny-aurora-orb ny-aurora-orb--1" />
        <span className="ny-aurora-orb ny-aurora-orb--2" />
        <span className="ny-aurora-orb ny-aurora-orb--3" />
      </div>

      {/* Верхняя шапка */}
      <header className="ny-header">
        <button className="ny-back" type="button" onClick={() => navigate(-1)} aria-label="Назад">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Назад</span>
        </button>
        <div className="ny-header__pill">
          <span className="ny-header__dot" />
          <span>ZENOVA HOLIDAY MARATHON</span>
        </div>
        <button
          type="button"
          className="ny-music-shortcut"
          onClick={() => {
            haptic('light');
            navigate('/music');
          }}
          title="Праздничная музыка"
        >
          ♫
        </button>
      </header>

      {/* ═════ WOW HERO КАРТОЧКА С НОВОГОДНЕЙ МАСКОЙ И ТАЙМЕРОМ 2027 ═════ */}
      <section className="ny-hero-card" aria-labelledby="ny-title">
        <div className="ny-hero-card__frost" aria-hidden="true" />
        <div className="ny-hero-card__garland" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i /><i />
        </div>

        <div className="ny-hero-top">
          <div className="ny-mascot-stage">
            <div className="ny-mascot-halo" />
            <div className="ny-mascot-ring" />
            <img
              src="/zenova-mask-winter.png"
              alt="ZENOVA Новогодний маскот"
              className="ny-mascot-img"
              draggable={false}
            />
            <span className="ny-mascot-badge">🎄 2027 EDITION</span>
          </div>

          <div className="ny-hero__copy">
            <span className="ny-eyebrow">
              <i /> ЗИМНЯЯ КИНО-СКАЗКА ZENOVA
            </span>
            <h1 id="ny-title">
              {countdown.celebrating ? (
                <>С Новым <em>2027</em> годом!</>
              ) : (
                <>Новогодний <em>Кино-Марафон</em></>
              )}
            </h1>
            <p>
              Главные рождественские и новогодние шедевры в 4K, праздничная кино-рулетка и живой отсчёт до боя курантов.
            </p>
          </div>
        </div>

        {/* 3D Ледяной таймер обратного отсчёта */}
        <div className="ny-countdown" aria-label="Обратный отсчёт до Нового года">
          <div className="ny-countdown__heading">
            <span>{countdown.celebrating ? '🥂 Праздник наступил!' : '⏳ До Нового года осталось'}</span>
            <i />
          </div>
          <div className="ny-countdown__units">
            {[
              { label: 'ДНЕЙ', value: countdown.days, gold: false },
              { label: 'ЧАСОВ', value: countdown.hours, gold: false },
              { label: 'МИНУТ', value: countdown.minutes, gold: false },
              { label: 'СЕКУНД', value: countdown.seconds, gold: true },
            ].map((unit) => (
              <div className={`ny-time ${unit.gold ? 'ny-time--gold' : ''}`} key={unit.label}>
                <strong>{String(unit.value).padStart(2, '0')}</strong>
                <span>{unit.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Топ-кнопки быстрого действия */}
        <div className="ny-hero-btns">
          <button
            type="button"
            className={`ny-pro-btn ny-pro-btn--roulette ${spinning ? 'spinning' : ''}`}
            onClick={spinHolidayRoulette}
          >
            <span className="ny-pro-btn__shine" aria-hidden="true" />
            <span className="ny-pro-btn__icon">{spinning ? '❄️' : '🎰'}</span>
            <span>{spinning ? 'Крутим барабан чуда…' : 'Новогодняя рулетка фильма'}</span>
          </button>

          <button
            type="button"
            className="ny-pro-btn ny-pro-btn--glass"
            onClick={() => {
              haptic('light');
              navigate('/music');
            }}
          >
            <span>♫ Новогодний плейлист</span>
          </button>
        </div>
      </section>

      {/* ═════ ВЫПАВШИЙ ФИЛЬМ В НОВОГОДНЕЙ РУЛЕТКЕ ═════ */}
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
                <span className="ny-roulette-card__kicker">🎁 ВАШ ФИЛЬМ НА ВЕЧЕР</span>
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
                  ▶ Смотреть
                </button>
                <button
                  type="button"
                  className="ny-roulette-card__again"
                  onClick={spinHolidayRoulette}
                >
                  🎲 Крутить ещё
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═════ ФИЛЬТР ПРАЗДНИЧНОГО НАСТРОЕНИЯ ═════ */}
      <section className="ny-catalog-section">
        <div className="ny-section-head">
          <div>
            <span className="ny-section-kicker">🎄 ЗОЛОТАЯ КОЛЛЕКЦИЯ</span>
            <h2 className="ny-section-title">Фильмы для новогоднего настроения</h2>
          </div>
          <span className="ny-section-count">{filteredMovies.length} фильмов</span>
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
              {filteredMovies.map((movie, idx) => (
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
                    <span className="ny-movie-card__badge">🎄 #{idx + 1}</span>
                    {movie.vote_average > 0 && (
                      <span className="ny-movie-card__rate">★ {movie.vote_average.toFixed(1)}</span>
                    )}
                    <div className="ny-movie-card__play-overlay">
                      <span>▶ Смотреть</span>
                    </div>
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
                {loadingMore ? '❄️ Загружаем ещё фильмы…' : '✨ Показать больше новогодних фильмов'}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
};

export default NewYearPage;
