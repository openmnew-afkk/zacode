import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { STUDIO_WORLDS, discoverByStudio } from '../api/catalog';
import type { StudioId } from '../api/catalog';
import { useTelegram } from '../hooks/useTelegram';
import StudioWordmark from './StudioWordmark';
import './SideMenu.css';

export const openSideMenu = () => {
  window.dispatchEvent(new CustomEvent('zenova-open-drawer'));
};

export const closeSideMenu = () => {
  window.dispatchEvent(new CustomEvent('zenova-close-drawer'));
};

/* Кэш обложек студий на сессию */
const coverCache: Partial<Record<StudioId, string>> = {};

/* ═══════════════════════════════════════════════════════════════════════════
 *  ✦ ZENOVA Multiverse — Ультра-плавная карусель 7 кино-вселенных
 *  Без квадратных артефактов, с нативным 120 FPS скролл-снэпом и стрелками
 * ═══════════════════════════════════════════════════════════════════════════ */
export const SideMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [active, setActive] = useState(0);
  const [covers, setCovers] = useState<Partial<Record<StudioId, string>>>(coverCache);
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<(HTMLElement | null)[]>([]);
  const scrollTimeout = useRef<any>(null);
  const total = STUDIO_WORLDS.length;

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 220);
  }, []);

  useEffect(() => {
    const onOpen = () => { setClosing(false); setOpen(true); };
    const onClose = () => close();
    window.addEventListener('zenova-open-drawer', onOpen);
    window.addEventListener('zenova-close-drawer', onClose);
    return () => {
      window.removeEventListener('zenova-open-drawer', onOpen);
      window.removeEventListener('zenova-close-drawer', onClose);
    };
  }, [close]);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  /* Загрузка постеров/бэкдропов студий */
  useEffect(() => {
    if (!open) return;
    STUDIO_WORLDS.forEach((s) => {
      if (coverCache[s.id]) return;
      discoverByStudio(s.id)
        .then((r) => {
          const pick = r.hero?.[0] || r.items?.[0];
          const src = pick?.backdrop_path || pick?.poster_path;
          if (src) {
            coverCache[s.id] = src;
            setCovers((c) => ({ ...c, [s.id]: src }));
          }
        })
        .catch(() => {});
    });
  }, [open]);

  const enter = (id: StudioId) => {
    haptic('heavy');
    setOpen(false);
    navigate(`/studios/${id}`);
  };

  const scrollToIdx = (idx: number, smooth = true) => {
    const clamped = Math.max(0, Math.min(total - 1, idx));
    const cardEl = cardsRef.current[clamped];
    if (cardEl && trackRef.current) {
      cardEl.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        inline: 'center',
        block: 'nearest',
      });
      setActive(clamped);
    }
  };

  /* Центрируем активную карточку при открытии */
  useEffect(() => {
    if (open) {
      setTimeout(() => scrollToIdx(active, false), 30);
    }
  }, [open]);

  /* Быстрый и плавный расчёт активной карточки через scroll listener */
  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      const trackCenter = track.scrollLeft + track.clientWidth / 2;
      let closestIdx = 0;
      let minDiff = Infinity;

      cardsRef.current.forEach((card, idx) => {
        if (!card) return;
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const diff = Math.abs(trackCenter - cardCenter);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });

      if (closestIdx !== active) {
        setActive(closestIdx);
        haptic('light');
      }
    }, 45);
  };

  /* Поддержка клавиатуры (ноутбук / ПК / TG Web) */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') scrollToIdx(active + 1);
      if (e.key === 'ArrowLeft') scrollToIdx(active - 1);
      if (e.key === 'Escape') close();
      if (e.key === 'Enter') enter(STUDIO_WORLDS[active].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, active]);

  if (!open) return null;

  const current = STUDIO_WORLDS[active];

  return (
    <div
      className={`mv ${closing ? 'is-closing' : ''}`}
      style={{ '--mv-accent': current.accentColor, '--mv-glow': current.glowColor } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label="Кино-вселенные"
    >
      {/* Живой фон активной вселенной без тяжелых фильтров на мобильных */}
      <div className="mv-bg" aria-hidden="true">
        {STUDIO_WORLDS.map((s, i) => (
          <div
            key={s.id}
            className={`mv-bg__layer ${i === active ? 'on' : ''}`}
            style={covers[s.id] ? { backgroundImage: `url(${covers[s.id]})` } : undefined}
          />
        ))}
        <div className="mv-bg__veil" />
      </div>

      <header className="mv-head">
        <div>
          <span className="mv-head__kicker">ZENOVA MULTIVERSE</span>
          <h2 className="mv-head__title">Вселенные</h2>
        </div>
        <button
          type="button"
          className="mv-head__close"
          onClick={() => { haptic('light'); close(); }}
          aria-label="Закрыть"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      {/* ── Нативная карусель 120 FPS со скролл-снэпом — нулевой лаг, постоянные круглые углы ── */}
      <div className="mv-carousel-container">
        {/* Стрелки для ноутов и TG Web */}
        <button
          type="button"
          className="mv-nav-arrow mv-nav-arrow--left"
          onClick={() => scrollToIdx(active - 1)}
          aria-label="Предыдущая вселенная"
          disabled={active === 0}
        >
          ‹
        </button>

        <div
          ref={trackRef}
          className="mv-track"
          onScroll={handleScroll}
        >
          {STUDIO_WORLDS.map((s, i) => {
            const isActive = i === active;
            return (
              <article
                key={s.id}
                ref={(el) => { cardsRef.current[i] = el; }}
                className={`mv-card ${isActive ? 'is-active' : ''}`}
                style={{
                  '--st-accent': s.accentColor,
                  '--st-glow': s.glowColor,
                } as React.CSSProperties}
                onClick={() => {
                  if (isActive) enter(s.id);
                  else scrollToIdx(i);
                }}
              >
                <div
                  className="mv-card__cover"
                  style={covers[s.id] ? { backgroundImage: `url(${covers[s.id]})` } : undefined}
                />
                <div className="mv-card__shade" />
                <span className="mv-card__num">{String(i + 1).padStart(2, '0')}</span>
                <span className="mv-card__badge">{s.badgeText}</span>
                <div className="mv-card__logo">
                  <StudioWordmark id={s.id} size="lg" />
                </div>
              </article>
            );
          })}
        </div>

        <button
          type="button"
          className="mv-nav-arrow mv-nav-arrow--right"
          onClick={() => scrollToIdx(active + 1)}
          aria-label="Следующая вселенная"
          disabled={active === total - 1}
        >
          ›
        </button>
      </div>

      {/* Инфо активной вселенной */}
      <div className="mv-info" key={current.id}>
        <p className="mv-info__tagline">{current.tagline}</p>
        <p className="mv-info__desc">{current.description}</p>
      </div>

      <div className="mv-foot">
        <div className="mv-dots">
          {STUDIO_WORLDS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`mv-dot ${i === active ? 'on' : ''}`}
              onClick={() => scrollToIdx(i)}
              aria-label={s.shortName}
            />
          ))}
        </div>
        <button
          type="button"
          className="mv-enter"
          onClick={() => enter(current.id)}
        >
          <span>Войти в {current.shortName}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SideMenu;
