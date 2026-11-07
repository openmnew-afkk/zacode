/* ═══════════════════════════════════════════════════════════════════
   ZENOVA — КИНО-МИРЫ (СТУДИИ И СТРИМИНГИ)
   Уникальный кастомный дизайн для каждого мира:
   Netflix • Disney+ • HBO Max • Apple TV+ • Marvel • A24 • Anime
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  STUDIO_WORLDS,
  discoverByStudio,
  type StudioId,
  type StudioWorldConfig,
} from '../api/catalog';
import { useTelegram } from '../hooks/useTelegram';
import type { Movie } from '../types';
import './StudiosPage.css';

/* Фирменные векторные логотипы/эмблемы для каждого Кино-Мира */
function StudioBrandMark({ id }: { id: StudioId }) {
  switch (id) {
    case 'netflix':
      return (
        <svg viewBox="0 0 36 36" fill="none" className="sw-brand-svg">
          <rect width="36" height="36" rx="9" fill="#0b0b0e" />
          <path d="M10 7H15L21 20.5V7H26V29H21L15 15.5V29H10V7Z" fill="#E50914" />
          <path d="M10 7H15L26 29H21L10 7Z" fill="#FF2A32" fillOpacity="0.9" />
        </svg>
      );
    case 'disney':
      return (
        <svg viewBox="0 0 36 36" fill="none" className="sw-brand-svg">
          <rect width="36" height="36" rx="9" fill="#04142c" />
          <path
            d="M7 22C10.5 11.5 25.5 11.5 29 22"
            stroke="url(#disneyArc)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M11 25.5V16.5H16.5C19.5 16.5 21.5 18.3 21.5 21C21.5 23.7 19.5 25.5 16.5 25.5H11Z"
            stroke="#fff"
            strokeWidth="2.2"
          />
          <path d="M25.5 15V21M22.5 18H28.5" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
          <defs>
            <linearGradient id="disneyArc" x1="7" y1="22" x2="29" y2="14" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0063e5" />
              <stop offset="0.6" stopColor="#38bdf8" />
              <stop offset="1" stopColor="#bae6fd" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'hbo':
      return (
        <svg viewBox="0 0 36 36" fill="none" className="sw-brand-svg">
          <rect width="36" height="36" rx="9" fill="#120824" />
          <circle cx="18" cy="18" r="9.5" stroke="url(#hboGrad)" strokeWidth="2.4" />
          <circle cx="18" cy="18" r="3.8" fill="#c084fc" />
          <defs>
            <linearGradient id="hboGrad" x1="6" y1="6" x2="30" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a855f7" />
              <stop offset="1" stopColor="#6366f1" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'apple':
      return (
        <svg viewBox="0 0 36 36" fill="none" className="sw-brand-svg">
          <rect width="36" height="36" rx="9" fill="#141417" />
          <path
            d="M21.8 18.8C21.8 16.3 23.8 15 23.9 14.9C22.7 13.2 20.9 13 20.3 12.9C18.8 12.7 17.3 13.8 16.5 13.8C15.7 13.8 14.5 12.9 13.2 12.9C11.5 12.9 9.9 13.9 9.1 15.4C7.3 18.5 8.6 23.1 10.3 25.6C11.2 26.8 12.2 28.2 13.5 28.1C14.8 28 15.3 27.3 16.8 27.3C18.3 27.3 18.7 28.1 20.1 28.1C21.5 28.1 22.3 26.9 23.1 25.6C24.1 24.2 24.5 22.8 24.5 22.7C24.4 22.6 21.8 21.6 21.8 18.8Z"
            fill="#f5f5f7"
          />
          <path
            d="M19.3 11C20 10.1 20.5 8.9 20.3 7.7C19.3 7.8 18 8.4 17.3 9.2C16.7 9.9 16.1 11.2 16.3 12.4C17.4 12.5 18.6 11.8 19.3 11Z"
            fill="#f5f5f7"
          />
        </svg>
      );
    case 'marvel':
      return (
        <svg viewBox="0 0 36 36" fill="none" className="sw-brand-svg">
          <rect width="36" height="36" rx="9" fill="#ed1d24" />
          <path
            d="M8 10H13L18 20L23 10H28V26H24V16.5L19.5 25.5H16.5L12 16.5V26H8V10Z"
            fill="#ffffff"
          />
        </svg>
      );
    case 'a24':
      return (
        <svg viewBox="0 0 36 36" fill="none" className="sw-brand-svg">
          <rect width="36" height="36" rx="9" fill="#141311" />
          <rect x="4" y="4" width="28" height="28" rx="6" stroke="#d6d3d1" strokeOpacity="0.4" strokeWidth="1" />
          <text
            x="18"
            y="22"
            textAnchor="middle"
            fill="#f5f5f4"
            fontSize="11.5"
            fontWeight="800"
            fontFamily="Georgia, serif"
            letterSpacing="1"
          >
            A24
          </text>
        </svg>
      );
    case 'anime':
      return (
        <svg viewBox="0 0 36 36" fill="none" className="sw-brand-svg">
          <rect width="36" height="36" rx="9" fill="#1a0818" />
          <circle cx="18" cy="18" r="9" stroke="#ff2a85" strokeWidth="2.2" />
          <path d="M15.5 14L22.5 18L15.5 22V14Z" fill="#fb923c" />
        </svg>
      );
  }
}

export function StudiosPage() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { studioId: paramStudioId } = useParams<{ studioId?: string }>();

  const activeStudioId: StudioId = useMemo(() => {
    const valid = STUDIO_WORLDS.find((s) => s.id === paramStudioId);
    return valid ? valid.id : 'netflix';
  }, [paramStudioId]);

  const studio: StudioWorldConfig = useMemo(
    () => STUDIO_WORLDS.find((s) => s.id === activeStudioId) || STUDIO_WORLDS[0],
    [activeStudioId]
  );

  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [collectionId, setCollectionId] = useState<string>('all');
  const [heroList, setHeroList] = useState<Movie[]>([]);
  const [top10List, setTop10List] = useState<Movie[]>([]);
  const [items, setItems] = useState<Movie[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Сброс фильтров при переключении студии
  useEffect(() => {
    setMediaType(studio.defaultTab);
    setCollectionId('all');
    setPage(1);
    setHeroIdx(0);
  }, [studio.id, studio.defaultTab]);

  // Загрузка контента выбранного Кино-Мира
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    discoverByStudio(studio.id, { page: 1, mediaType, collectionId })
      .then((res) => {
        if (cancelled) return;
        setHeroList(res.hero);
        setTop10List(res.top10);
        setItems(res.items);
        setHeroIdx(0);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [studio.id, mediaType, collectionId]);

  // Авто-слайдер Hero
  useEffect(() => {
    if (heroList.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % heroList.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [heroList.length]);

  const handleSelectStudio = (id: StudioId) => {
    haptic('light');
    navigate(`/studios/${id}`, { replace: true });
  };

  const handleLoadMore = async () => {
    if (loadingMore) return;
    haptic('light');
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await discoverByStudio(studio.id, {
        page: nextPage,
        mediaType,
        collectionId,
      });
      setItems((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        for (const m of res.items) {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            merged.push(m);
          }
        }
        return merged;
      });
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  };

  const currentHero = heroList[heroIdx] || items[0] || null;

  return (
    <div
      className={`sw-page sw-theme--${studio.id}`}
      style={
        {
          '--sw-accent': studio.accentColor,
          '--sw-secondary': studio.secondaryColor,
          '--sw-glow': studio.glowColor,
        } as React.CSSProperties
      }
    >
      {/* ═════ Уникальные атмосферные спецэффекты каждого Кино-Мира ═════ */}
      <div className="sw-ambient" aria-hidden="true">
        <div className="sw-ambient-orb sw-ambient-orb--1" />
        <div className="sw-ambient-orb sw-ambient-orb--2" />
        {studio.id === 'netflix' && (
          <div className="sw-netflix-beams">
            <span /><span /><span /><span /><span /><span />
          </div>
        )}
        {studio.id === 'disney' && (
          <div className="sw-disney-stars">
            <span className="sw-star s1" />
            <span className="sw-star s2" />
            <span className="sw-star s3" />
            <span className="sw-star s4" />
            <span className="sw-star s5" />
            <div className="sw-disney-arc-bg" />
          </div>
        )}
        {studio.id === 'hbo' && <div className="sw-hbo-aurora" />}
        {studio.id === 'apple' && <div className="sw-apple-sheen" />}
        {studio.id === 'marvel' && <div className="sw-marvel-halftone" />}
        {studio.id === 'a24' && <div className="sw-a24-filmgrain" />}
        {studio.id === 'anime' && <div className="sw-anime-grid" />}
      </div>

      {/* ═════ Шапка с возвратом и переключателем Кино-Миров ═════ */}
      <header className="sw-header">
        <div className="sw-header-top">
          <button
            className="sw-back-btn"
            onClick={() => {
              haptic('light');
              navigate('/');
            }}
            aria-label="На главную"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span>Главная</span>
          </button>

          <div className="sw-header-title-wrap">
            <span className="sw-header-kicker">ZENOVA • КИНО-МИРЫ</span>
            <h1 className="sw-header-title">{studio.name}</h1>
          </div>

          <button
            className="sw-search-btn"
            onClick={() => {
              haptic('light');
              navigate('/search');
            }}
            aria-label="Поиск"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
        </div>

        {/* Док переключения студий */}
        <div className="sw-dock" role="tablist" aria-label="Выбор студии">
          {STUDIO_WORLDS.map((item) => {
            const active = item.id === studio.id;
            return (
              <button
                key={item.id}
                role="tab"
                aria-selected={active}
                className={`sw-dock-item ${active ? 'sw-dock-item--active' : ''} sw-dock-item--${item.id}`}
                onClick={() => handleSelectStudio(item.id)}
              >
                <div className="sw-dock-icon">
                  <StudioBrandMark id={item.id} />
                </div>
                <span className="sw-dock-label">{item.shortName}</span>
                {active && <span className="sw-dock-indicator" />}
              </button>
            );
          })}
        </div>
      </header>

      {/* ═════ Фирменный Hero-блок выбранной студии ═════ */}
      <section className="sw-hero">
        {currentHero ? (
          <div
            className="sw-hero-card"
            onClick={() => {
              haptic('medium');
              navigate(`/movie/${currentHero.id}`);
            }}
          >
            <img
              key={currentHero.id}
              src={currentHero.backdrop_path || currentHero.poster_path}
              alt={currentHero.title}
              className="sw-hero-img"
            />
            <div className="sw-hero-vignette" />

            {/* Верхний бейдж студии */}
            <div className="sw-hero-top">
              <div className="sw-studio-pill">
                <StudioBrandMark id={studio.id} />
                <div className="sw-studio-pill-text">
                  <span className="sw-studio-pill-badge">{studio.badgeText}</span>
                  <span className="sw-studio-pill-sub">{studio.tagline}</span>
                </div>
              </div>
              {studio.id === 'anime' && (
                <span className="sw-jp-stamp">アニメ • 4K</span>
              )}
              {studio.id === 'a24' && (
                <span className="sw-a24-stamp">35MM ARCHIVE • CURATED</span>
              )}
            </div>

            {/* Контент Hero */}
            <div className="sw-hero-body">
              <div className="sw-hero-meta">
                {currentHero.imdb_rating > 0 && (
                  <span className="sw-hero-rating">★ {currentHero.imdb_rating.toFixed(1)}</span>
                )}
                {currentHero.release_date && (
                  <span className="sw-hero-chip">{currentHero.release_date.slice(0, 4)}</span>
                )}
                <span className="sw-hero-chip">
                  {currentHero.is_serial ? 'Сериал' : 'Фильм'}
                </span>
                <span className="sw-hero-chip sw-hero-chip--accent">Ultra HD</span>
              </div>

              <h2 className="sw-hero-title">{currentHero.title}</h2>
              {currentHero.overview && (
                <p className="sw-hero-overview">{currentHero.overview}</p>
              )}

              <div className="sw-hero-actions">
                <button
                  className="sw-hero-cta"
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic('medium');
                    navigate(`/movie/${currentHero.id}`);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.14v14l11-7-11-7z" />
                  </svg>
                  <span>Смотреть в {studio.shortName}</span>
                </button>

                {heroList.length > 1 && (
                  <div className="sw-hero-dots" onClick={(e) => e.stopPropagation()}>
                    {heroList.map((h, idx) => (
                      <button
                        key={h.id}
                        className={`sw-hero-dot ${idx === heroIdx ? 'active' : ''}`}
                        onClick={() => {
                          haptic('light');
                          setHeroIdx(idx);
                        }}
                        aria-label={`Слайд ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="sw-hero-skeleton skeleton" />
        )}

        {/* Описание атмосферы мира */}
        <div className="sw-world-manifesto">
          <div className="sw-world-manifesto-left">
            <span className="sw-world-manifesto-dot" />
            <p className="sw-world-manifesto-text">{studio.description}</p>
          </div>
          <div className="sw-type-tabs">
            {(['all', 'movie', 'tv'] as const).map((t) => (
              <button
                key={t}
                className={`sw-type-tab ${mediaType === t ? 'active' : ''}`}
                onClick={() => {
                  haptic('light');
                  setMediaType(t);
                }}
              >
                {t === 'all' ? 'Все' : t === 'movie' ? 'Фильмы' : 'Сериалы'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═════ Подборки внутри студии ═════ */}
      <div className="sw-collections-bar">
        {studio.collections.map((c) => (
          <button
            key={c.id}
            className={`sw-collection-pill ${collectionId === c.id ? 'active' : ''}`}
            onClick={() => {
              haptic('light');
              setCollectionId(c.id);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ═════ ТОП-10 Студии (в стиле каждого мира) ═════ */}
      {!loading && top10List.length > 0 && collectionId === 'all' && (
        <section className="sw-top10-section">
          <div className="sw-section-head">
            <div className="sw-section-title-group">
              <span className="sw-top10-badge">ТОП 10</span>
              <h3 className="sw-section-title">Главные хиты {studio.shortName}</h3>
            </div>
            <span className="sw-section-sub">По популярности в мире</span>
          </div>

          <div className="sw-top10-track">
            {top10List.map((movie, idx) => (
              <div
                key={movie.id}
                className="sw-top10-card"
                onClick={() => {
                  haptic('light');
                  navigate(`/movie/${movie.id}`);
                }}
              >
                <span className="sw-top10-rank" aria-hidden="true">
                  {idx + 1}
                </span>
                <div className="sw-top10-poster-wrap">
                  <img
                    src={movie.poster_path}
                    alt={movie.title}
                    loading="lazy"
                    className="sw-top10-poster"
                  />
                  <span className="sw-card-studio-tag">{studio.shortName}</span>
                  {movie.imdb_rating > 0 && (
                    <span className="sw-top10-rate">★ {movie.imdb_rating.toFixed(1)}</span>
                  )}
                </div>
                <p className="sw-top10-name">{movie.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═════ Сетка каталога студии ═════ */}
      <section className="sw-catalog-section">
        <div className="sw-section-head">
          <h3 className="sw-section-title">
            Каталог {studio.name}
          </h3>
          <span className="sw-section-sub">{items.length} тайтлов</span>
        </div>

        {loading ? (
          <div className="sw-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="sw-grid-skeleton skeleton" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="sw-empty">
            <p>В этой категории пока нет релизов. Попробуйте соседнюю вкладку.</p>
          </div>
        ) : (
          <>
            <div className="sw-grid">
              {items.map((movie) => (
                <div
                  key={movie.id}
                  className="sw-grid-item"
                  onClick={() => {
                    haptic('light');
                    navigate(`/movie/${movie.id}`);
                  }}
                >
                  <div className="sw-movie-card__poster-wrap">
                    <img
                      src={movie.poster_path}
                      alt={movie.title}
                      loading="lazy"
                      className="sw-movie-card__poster"
                    />
                    <span className="sw-grid-ribbon">{studio.shortName}</span>
                    {movie.vote_average > 0 && (
                      <span className="sw-movie-card__rating">★ {movie.vote_average.toFixed(1)}</span>
                    )}
                    {movie.is_serial && (
                      <span className="sw-movie-card__serial">Сериал</span>
                    )}
                  </div>
                  <p className="sw-movie-card__title">{movie.title}</p>
                  {movie.release_date && (
                    <span className="sw-movie-card__year">{movie.release_date.slice(0, 4)}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="sw-load-more-wrap">
              <button
                className="sw-load-more-btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Загружаем ещё...' : `Показать ещё из ${studio.shortName}`}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
