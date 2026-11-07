import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { STUDIO_WORLDS } from '../api/catalog';
import { useTelegram } from '../hooks/useTelegram';
import StudioWordmark from './StudioWordmark';
import './SideMenu.css';

export const openSideMenu = () => {
  window.dispatchEvent(new CustomEvent('zenova-open-drawer'));
};

export const closeSideMenu = () => {
  window.dispatchEvent(new CustomEvent('zenova-close-drawer'));
};

export const SideMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();

  const edgeSwipeStartX = useRef<number | null>(null);
  const edgeSwipeStartY = useRef<number | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);

    window.addEventListener('zenova-open-drawer', onOpen);
    window.addEventListener('zenova-close-drawer', onClose);
    return () => {
      window.removeEventListener('zenova-open-drawer', onOpen);
      window.removeEventListener('zenova-close-drawer', onClose);
    };
  }, []);

  // Автозакрытие при смене роута
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Глобальный свайп от левого края для открытия
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (open || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX <= 24) {
        edgeSwipeStartX.current = t.clientX;
        edgeSwipeStartY.current = t.clientY;
      } else {
        edgeSwipeStartX.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (edgeSwipeStartX.current === null || edgeSwipeStartY.current === null) return;
      const t = e.touches[0];
      const dx = t.clientX - edgeSwipeStartX.current;
      const dy = Math.abs(t.clientY - edgeSwipeStartY.current);
      if (dx > 36 && dx > dy * 1.3) {
        edgeSwipeStartX.current = null;
        edgeSwipeStartY.current = null;
        haptic('light');
        setOpen(true);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [open, haptic]);

  const selectStudio = (studioId: string) => {
    haptic('medium');
    setOpen(false);
    navigate(`/studios/${studioId}`);
  };

  const handleScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = 270;
    const scrollPos = el.scrollLeft;
    const newIdx = Math.round(scrollPos / cardWidth);
    if (newIdx >= 0 && newIdx < STUDIO_WORLDS.length && newIdx !== activeIdx) {
      setActiveIdx(newIdx);
    }
  };

  return (
    <>
      {/* ── Премиальная минималистичная Карусель Кино-Вселенных (ZENOVA Multiverse Carousel) ── */}
      {open && (
        <div
          className="sm-backdrop"
          onClick={() => {
            haptic('light');
            setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Карусель Кино-Вселенных"
        >
          <div
            className="sm-carousel-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Шапка модалки */}
            <div className="sm-carousel-head">
              <div className="sm-carousel-head__copy">
                <span className="sm-carousel-head__kicker">ZENOVA MULTIVERSE</span>
                <h2 className="sm-carousel-head__title">Кино-Вселенные</h2>
              </div>
              <button
                type="button"
                className="sm-carousel-head__close"
                onClick={() => {
                  haptic('light');
                  setOpen(false);
                }}
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            {/* Горизонтальная карусель карточек студий со скролл-снэпом */}
            <div
              ref={carouselRef}
              className="sm-carousel-track"
              onScroll={handleScroll}
            >
              {STUDIO_WORLDS.map((studio, idx) => {
                const isActive = activeIdx === idx;
                return (
                  <article
                    key={studio.id}
                    className={`sm-carousel-card ${isActive ? 'is-active' : ''}`}
                    style={
                      {
                        '--st-accent': studio.accentColor,
                        '--st-glow': studio.glowColor,
                      } as React.CSSProperties
                    }
                    onClick={() => selectStudio(studio.id)}
                  >
                    <div className="sm-carousel-card__halo" aria-hidden="true" />
                    
                    <div className="sm-carousel-card__badge-row">
                      <span className="sm-carousel-card__badge">{studio.badgeText}</span>
                      <span className="sm-carousel-card__num">0{idx + 1}</span>
                    </div>

                    <div className="sm-carousel-card__logo-wrap">
                      <StudioWordmark id={studio.id} size="lg" />
                    </div>

                    <p className="sm-carousel-card__tagline">{studio.tagline}</p>

                    <button
                      type="button"
                      className="sm-carousel-card__enter-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectStudio(studio.id);
                      }}
                    >
                      <span>Войти в мир</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </article>
                );
              })}
            </div>

            {/* Точки-индикаторы карусели */}
            <div className="sm-carousel-dots">
              {STUDIO_WORLDS.map((s, idx) => (
                <span
                  key={s.id}
                  className={`sm-carousel-dot ${activeIdx === idx ? 'is-active' : ''}`}
                  onClick={() => {
                    const el = carouselRef.current;
                    if (el) {
                      el.scrollTo({ left: idx * 270, behavior: 'smooth' });
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SideMenu;
