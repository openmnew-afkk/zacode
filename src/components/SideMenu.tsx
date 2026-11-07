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

/* Кэш обложек студий на сессию — повторное открытие мгновенное */
const coverCache: Partial<Record<StudioId, string>> = {};

/* ═══════════════════════════════════════════════════════════════════════════
 *  ✦ ZENOVA Multiverse — 3D Coverflow-карусель 7 кино-вселенных
 *  Свайп / тап по боковой карточке — прокрутка, тап по центральной — вход.
 * ═══════════════════════════════════════════════════════════════════════════ */
export const SideMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0); // в долях карточки
  const [dragging, setDragging] = useState(false);
  const [covers, setCovers] = useState<Partial<Record<StudioId, string>>>(coverCache);
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();

  const startX = useRef<number | null>(null);
  const moved = useRef(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const total = STUDIO_WORLDS.length;

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 240);
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

  /* Подгрузка обложек — один раз за сессию */
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

  /* Клавиатура (ноутбук / TG Web) */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setActive((a) => Math.min(total - 1, a + 1));
      if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, a - 1));
      if (e.key === 'Escape') close();
      if (e.key === 'Enter') enter(STUDIO_WORLDS[active].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const enter = (id: StudioId) => {
    haptic('heavy');
    setOpen(false);
    navigate(`/studios/${id}`);
  };

  const cardWidth = () => (stageRef.current?.clientWidth || 360) * 0.62;

  const onDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    moved.current = false;
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 6) moved.current = true;
    let off = -dx / cardWidth();
    // резиновое сопротивление на краях
    if (active + off < 0) off = -active + (active + off) * 0.3;
    if (active + off > total - 1) off = total - 1 - active + (active + off - (total - 1)) * 0.3;
    setDragOffset(off);
  };
  const onUp = () => {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);
    const next = Math.max(0, Math.min(total - 1, Math.round(active + dragOffset)));
    if (next !== active) haptic('light');
    setActive(next);
    setDragOffset(0);
  };

  const onCardClick = (idx: number) => {
    if (moved.current) return;
    if (idx === active) enter(STUDIO_WORLDS[idx].id);
    else { haptic('light'); setActive(idx); }
  };

  if (!open) return null;

  const pos = active + dragOffset;
  const current = STUDIO_WORLDS[active];

  return (
    <div
      className={`mv ${closing ? 'is-closing' : ''}`}
      style={{ '--mv-accent': current.accentColor, '--mv-glow': current.glowColor } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label="Кино-вселенные"
    >
      {/* Живой фон: размытая обложка активной вселенной */}
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
        <button type="button" className="mv-head__close" onClick={() => { haptic('light'); close(); }} aria-label="Закрыть">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>

      {/* 3D-сцена */}
      <div
        ref={stageRef}
        className={`mv-stage ${dragging ? 'is-dragging' : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={() => dragging && onUp()}
      >
        {STUDIO_WORLDS.map((s, i) => {
          const off = i - pos;
          const abs = Math.abs(off);
          if (abs > 2.6) return null;
          const style: React.CSSProperties = {
            transform: `translate3d(calc(-50% + ${off * 58}%), -50%, ${-abs * 120}px) rotateY(${-off * 32}deg) scale(${1 - Math.min(abs, 2) * 0.1})`,
            zIndex: 100 - Math.round(abs * 10),
            opacity: abs > 2 ? Math.max(0, 2.6 - abs) : 1,
            ['--st-accent' as any]: s.accentColor,
            ['--st-glow' as any]: s.glowColor,
          };
          return (
            <article
              key={s.id}
              className={`mv-card ${i === active ? 'is-active' : ''}`}
              style={style}
              onClick={() => onCardClick(i)}
            >
              <div className="mv-card__cover" style={covers[s.id] ? { backgroundImage: `url(${covers[s.id]})` } : undefined} />
              <div className="mv-card__shade" />
              <span className="mv-card__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="mv-card__badge">{s.badgeText}</span>
              <div className="mv-card__logo">
                <StudioWordmark id={s.id} size="lg" />
              </div>
              <div className="mv-card__shine" style={{ transform: `translateX(${off * 60}%)` }} />
            </article>
          );
        })}
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
              onClick={() => { haptic('light'); setActive(i); }}
              aria-label={s.shortName}
            />
          ))}
        </div>
        <button type="button" className="mv-enter" onClick={() => enter(current.id)}>
          Войти в {current.shortName}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
};

export default SideMenu;
