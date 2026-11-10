/* ═══════════════════════════════════════════════════════════════════
   ZENOVA — КИНО-МИРЫ & ВСЕЛЕННЫЕ (PREMIUM CINEMA EDITION)
   Ультра-плавный 120 FPS скроллинг, роскошный кинематографический визуал,
   живая атмосфера каждой вселенной и мгновенное переключение миров.
   ═══════════════════════════════════════════════════════════════════ */

import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  STUDIO_WORLDS,
  discoverByStudio,
  type StudioId,
  type StudioWorldConfig,
} from '../api/catalog';
import { useTelegram } from '../hooks/useTelegram';
import StudioWordmark from '../components/StudioWordmark';
import type { Movie } from '../types';
import './StudiosPage.css';

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
  const [showPortalDrawer, setShowPortalDrawer] = useState(false);
  const [heroList, setHeroList] = useState<Movie[]>([]);
  const [top10List, setTop10List] = useState<Movie[]>([]);
  const [items, setItems] = useState<Movie[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const stripRef = useRef<HTMLDivElement | null>(null);

  // Сброс фильтров при переключении вселенной
  useEffect(() => {
    setMediaType(studio.defaultTab);
    setCollectionId('all');
    setPage(1);
    setHeroIdx(0);
    setShowPortalDrawer(false);
  }, [studio.id, studio.defaultTab]);

  // Загрузка контента выбранной вселенной
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

  // Плавный авто-слайдер Hero (6.5s)
  useEffect(() => {
    if (heroList.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIdx((prev) => (prev + 1) % heroList.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [heroList.length]);

  // Центрируем активную плашку студии в горизонтальной ленте
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const activeChip = strip.querySelector<HTMLElement>('.sw-studio-chip.is-active');
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [studio.id]);

  const handleSelectStudio = (id: StudioId) => {
    if (id === studio.id) return;
    haptic('medium');
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
      {/* ═════ Единый глубокий тёмный кино-фон + мягкий неон только у верхней шапки ═════ */}
      <div className="sw-ambient" aria-hidden="true">
        <div className="sw-header-halo" />
      </div>

      {/* ═════ Премиальная кино-шапка ═════ */}
      <header className="sw-header">
        <div className="sw-header-top">
          <button
            type="button"
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

          {/* Центральный триггер Мультивселенной: Wordmark + стрелка вызова портала */}
          <button
            type="button"
            className="sw-universe-trigger"
            onClick={() => {
              haptic('light');
              setShowPortalDrawer((prev) => !prev);
            }}
            aria-expanded={showPortalDrawer}
            title="Открыть список всех вселенных"
          >
            <div className="sw-universe-trigger__brand">
              <StudioWordmark id={studio.id} size="sm" />
            </div>
            <span className={`sw-universe-trigger__caret ${showPortalDrawer ? 'is-open' : ''}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </button>

          <button
            type="button"
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

        {/* ── Горизонтальная лента мгновенного переключения вселенных ── */}
        <div ref={stripRef} className="sw-studios-strip" role="tablist" aria-label="Вселенные">
          {STUDIO_WORLDS.map((item) => {
            const isActive = item.id === studio.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`sw-studio-chip ${isActive ? 'is-active' : ''}`}
                style={
                  {
                    '--chip-accent': item.accentColor,
                    '--chip-glow': item.glowColor,
                  } as React.CSSProperties
                }
                onClick={() => handleSelectStudio(item.id)}
              >
                <StudioWordmark id={item.id} size="sm" />
                {isActive && <span className="sw-chip-pip" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </header>

      {/* ═════ Интерактивный выезжающий портал всех киновселенных ═════ */}
      {showPortalDrawer && (
        <div className="sw-portal-overlay" onClick={() => setShowPortalDrawer(false)}>
          <div className="sw-portal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sw-portal-head">
              <div>
                <span className="sw-portal-kicker">ZENOVA MULTIVERSE</span>
                <h3 className="sw-portal-title">Вселенные</h3>
              </div>
              <button
                type="button"
                className="sw-portal-close"
                onClick={() => setShowPortalDrawer(false)}
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
            <div className="sw-portal-list">
              {STUDIO_WORLDS.map((item) => {
                const isActive = item.id === studio.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sw-portal-card ${isActive ? 'is-active' : ''}`}
                    style={
                      {
                        '--card-accent': item.accentColor,
                        '--card-glow': item.glowColor,
                      } as React.CSSProperties
                    }
                    onClick={() => {
                      setShowPortalDrawer(false);
                      handleSelectStudio(item.id);
                    }}
                  >
                    <div className="sw-portal-card__brand">
                      <StudioWordmark id={item.id} size="md" />
                    </div>
                    <div className="sw-portal-card__meta">
                      <span className="sw-portal-card__badge">{item.badgeText}</span>
                      <p className="sw-portal-card__tagline">{item.tagline}</p>
                    </div>
                    {isActive && <span className="sw-portal-card__check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═════ Роскошный панорамный Hero-блок (IMAX Premiere) ═════ */}
      <section className="sw-hero">
        {currentHero ? (
          <div
            className="sw-hero-card"
            onClick={() => {
              haptic('medium');
              navigate(`/movie/${currentHero.id}`);
            }}
          >
            <div
              className="sw-hero-img-wrap"
              style={{
                backgroundImage: `url(${currentHero.backdrop_path || currentHero.poster_path})`,
              }}
            />
            <div className="sw-hero-vignette" />

            {/* Фирменный бейдж студии + 4K значок */}
            <div className="sw-hero-top-badge">
              <span className="sw-studio-badge">{studio.badgeText}</span>
              <span className="sw-studio-quality">4K ULTRA HD · DOLBY ATMOS</span>
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
                <span className="sw-hero-chip sw-hero-chip--accent">{studio.shortName}</span>
              </div>

              <h2 className="sw-hero-title">{currentHero.title}</h2>
              {currentHero.overview && (
                <p className="sw-hero-overview">{currentHero.overview}</p>
              )}

              <div className="sw-hero-actions">
                <button
                  type="button"
                  className="sw-hero-cta"
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic('medium');
                    navigate(`/movie/${currentHero.id}`);
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.14v14l11-7-11-7z" />
                  </svg>
                  <span>Смотреть</span>
                </button>

                <button
                  type="button"
                  className="sw-hero-sub-cta"
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic('light');
                    navigate(`/movie/${currentHero.id}`);
                  }}
                >
                  <span>О релизе</span>
                </button>

                {heroList.length > 1 && (
                  <div className="sw-hero-dots" onClick={(e) => e.stopPropagation()}>
                    {heroList.map((h, idx) => (
                      <button
                        key={h.id}
                        type="button"
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

        {/* Манифест Вселенной + Переключатель Все/Фильмы/Сериалы */}
        <div className="sw-world-manifesto">
          <div className="sw-world-manifesto-info">
            <span className="sw-world-manifesto-tagline">{studio.tagline}</span>
            <p className="sw-world-manifesto-text">{studio.description}</p>
          </div>
          <div className="sw-type-tabs" role="tablist" aria-label="Тип релиза">
            {(['all', 'movie', 'tv'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={mediaType === t}
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

      {/* ═════ Тематические коллекции / Саги внутри вселенной ═════ */}
      {studio.collections && studio.collections.length > 0 && (
        <div className="sw-collections-bar" role="tablist" aria-label="Рубрики">
          {studio.collections.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={collectionId === c.id}
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
      )}

      {/* ═════ ТОП-10 Вселенной ═════ */}
      {!loading && top10List.length > 0 && collectionId === 'all' && (
        <section className="sw-top10-section">
          <div className="sw-section-head">
            <div className="sw-section-title-group">
              <span className="sw-top10-badge">ТОП 10</span>
              <h3 className="sw-section-title">Главные хиты {studio.shortName}</h3>
            </div>
            <span className="sw-section-sub">Популярно сейчас</span>
          </div>

          <div className="sw-top10-track">
            {top10List.map((movie, idx) => (
              <div
                key={movie.id}
                className="sw-top10-item"
                onClick={() => {
                  haptic('light');
                  navigate(`/movie/${movie.id}`);
                }}
              >
                <span className="sw-top10-num" aria-hidden="true">
                  {idx + 1}
                </span>
                <div className="sw-top10-poster">
                  <img
                    src={movie.poster_path}
                    alt={movie.title}
                    loading="lazy"
                  />
                  <span className="sw-card-studio-tag">{studio.shortName}</span>
                  {movie.imdb_rating > 0 && (
                    <span className="sw-top10-rate">
                      <svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="#fbbf24" aria-hidden="true">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span>{movie.imdb_rating.toFixed(1)}</span>
                    </span>
                  )}
                </div>
                <p className="sw-top10-name">{movie.title}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═════ Каталог вселенной (премиум сетка) ═════ */}
      <section className="sw-catalog-section">
        <div className="sw-section-head">
          <div className="sw-section-title-group">
            <h3 className="sw-section-title">Каталог {studio.name}</h3>
            <span className="sw-section-sub">• {items.length} релизов</span>
          </div>
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
                type="button"
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
export default StudiosPage;
