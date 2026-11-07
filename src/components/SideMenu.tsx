import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { STUDIO_WORLDS } from '../api/catalog';
import { useTelegram } from '../hooks/useTelegram';
import StudioWordmark from './StudioWordmark';
import './SideMenu.css';

export const openSideMenu = () => {
  window.dispatchEvent(new CustomEvent('zenova-open-drawer'));
};

export const SideMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();

  const touchStartY = useRef<number | null>(null);
  const touchAccumY = useRef<number>(0);
  const wheelLock = useRef<boolean>(false);

  const count = STUDIO_WORLDS.length;

  useEffect(() => {
    const onOpen = () => {
      // Sync initial active wheel item with current studio route if inside one
      const match = location.pathname.match(/^\/studios\/([^/]+)/);
      if (match) {
        const found = STUDIO_WORLDS.findIndex((s) => s.id === match[1]);
        if (found >= 0) setActiveIdx(found);
      }
      setOpen(true);
    };
    const onClose = () => setOpen(false);

    window.addEventListener('zenova-open-drawer', onOpen);
    window.addEventListener('zenova-close-drawer', onClose);
    return () => {
      window.removeEventListener('zenova-open-drawer', onOpen);
      window.removeEventListener('zenova-close-drawer', onClose);
    };
  }, [location.pathname]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const stepWheel = (delta: number) => {
    haptic('light');
    setActiveIdx((prev) => (prev + delta + count) % count);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchAccumY.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const dy = currentY - touchStartY.current;
    touchAccumY.current += dy;
    touchStartY.current = currentY;

    const threshold = 44;
    if (Math.abs(touchAccumY.current) >= threshold) {
      const steps = Math.trunc(touchAccumY.current / threshold);
      // Dragging down rotates wheel up (previous item moves into center)
      stepWheel(-steps);
      touchAccumY.current -= steps * threshold;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
    touchAccumY.current = 0;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (wheelLock.current) return;
    if (Math.abs(e.deltaY) < 10) return;
    wheelLock.current = true;
    stepWheel(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => {
      wheelLock.current = false;
    }, 150);
  };

  const openStudio = (studioId: string) => {
    haptic('medium');
    setOpen(false);
    navigate(`/studios/${studioId}`);
  };

  if (!open) return null;

  const activeStudio = STUDIO_WORLDS[activeIdx] || STUDIO_WORLDS[0];

  // Compute circular signed offset in range [-floor(count/2), +floor(count/2)]
  const getSignedOffset = (index: number) => {
    let diff = (index - activeIdx) % count;
    if (diff > count / 2) diff -= count;
    if (diff < -count / 2) diff += count;
    return diff;
  };

  return (
    <div
      className="sm-overlay"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Карусель Кино-Вселенных"
    >
      <aside
        className="sm-carousel-drawer"
        style={
          {
            '--active-accent': activeStudio.accentColor,
            '--active-glow': activeStudio.glowColor,
          } as React.CSSProperties
        }
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Top Close & Hint Header */}
        <div className="sm-carousel__top">
          <div className="sm-carousel__title-block">
            <span className="sm-carousel__kicker">ZENOVA UNIVERSES</span>
            <h2 className="sm-carousel__title">Кино-Вселенные</h2>
          </div>
          <button
            type="button"
            className="sm-carousel__close"
            onClick={() => {
              haptic('light');
              setOpen(false);
            }}
            aria-label="Закрыть меню"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ═════ CURVED ARC / WHEEL CAROUSEL STAGE (Pinterest 744360644697474986) ═════ */}
        <div className="sm-wheel-stage">
          {/* Curved Semi-Circular Dark Drum & Glowing Orbital Track SVG */}
          <svg
            className="sm-wheel-arc-svg"
            viewBox="0 0 320 620"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="smArcGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
                <stop offset="50%" stopColor={activeStudio.accentColor} stopOpacity="0.85" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
              </linearGradient>
              <radialGradient id="smDrumFill" cx="0%" cy="50%" r="95%">
                <stop offset="0%" stopColor="#1b1f32" stopOpacity="0.96" />
                <stop offset="72%" stopColor="#0d101b" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#070910" stopOpacity="0.0" />
              </radialGradient>
            </defs>

            {/* Inner dark curved wheel body */}
            <path
              d="M -120 20 A 290 290 0 0 1 -120 600 L -120 20 Z"
              fill="url(#smDrumFill)"
            />

            {/* Outer dashed orbital guide */}
            <circle
              cx="-95"
              cy="310"
              r="235"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1.2"
              strokeDasharray="4 6"
            />

            {/* Main glowing orbital arc passing through the orbs */}
            <circle
              cx="-95"
              cy="310"
              r="205"
              stroke="url(#smArcGrad)"
              strokeWidth="2.4"
            />
          </svg>

          {/* Center Focus Ring (exact match to the white/glowing circle ring on the arc in the reference) */}
          <div className="sm-wheel-focus-ring" aria-hidden="true">
            <span className="sm-wheel-focus-ring__halo" />
          </div>

          {/* Rotating Circular Studio Orbs along the Arc */}
          <div className="sm-wheel-orbs">
            {STUDIO_WORLDS.map((st, idx) => {
              const offset = getSignedOffset(idx);
              const isCenter = offset === 0;
              // Angle in degrees along the right side of the wheel (-68deg to +68deg)
              const angleDeg = offset * 24;
              const angleRad = (angleDeg * Math.PI) / 180;
              const radius = 205;
              // Center of wheel is at x = -95px relative to the left edge of the stage
              const x = Math.round(-95 + Math.cos(angleRad) * radius);
              const y = Math.round(Math.sin(angleRad) * radius);
              const scale = isCenter ? 1.15 : Math.max(0.64, 0.94 - Math.abs(offset) * 0.12);
              const opacity = Math.abs(offset) > 3 ? 0 : Math.max(0.32, 1 - Math.abs(offset) * 0.22);

              return (
                <button
                  key={st.id}
                  type="button"
                  className={`sm-orb sm-orb--${st.id} ${isCenter ? 'is-active' : ''}`}
                  style={
                    {
                      '--orb-x': `${x}px`,
                      '--orb-y': `${y}px`,
                      '--orb-scale': scale,
                      '--orb-opacity': opacity,
                      '--orb-accent': st.accentColor,
                      '--orb-glow': st.glowColor,
                      zIndex: 10 - Math.abs(offset),
                    } as React.CSSProperties
                  }
                  onClick={() => {
                    if (isCenter) {
                      openStudio(st.id);
                    } else {
                      haptic('light');
                      setActiveIdx(idx);
                    }
                  }}
                  aria-label={st.name}
                >
                  <span className="sm-orb__inner">
                    <StudioWordmark id={st.id} size="sm" />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right-side Active Universe Spotlight Card */}
          <div className="sm-spotlight">
            <div className="sm-spotlight__controls">
              <button
                type="button"
                className="sm-spotlight__step-btn"
                onClick={() => stepWheel(-1)}
                aria-label="Предыдущая вселенная"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 15l-6-6-6 6" />
                </svg>
              </button>
              <span className="sm-spotlight__counter">
                {activeIdx + 1} / {count}
              </span>
              <button
                type="button"
                className="sm-spotlight__step-btn"
                onClick={() => stepWheel(1)}
                aria-label="Следующая вселенная"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>

            <div
              className="sm-spotlight__card"
              onClick={() => openStudio(activeStudio.id)}
              role="button"
              tabIndex={0}
            >
              <span className="sm-spotlight__badge">{activeStudio.badgeText}</span>
              <div className="sm-spotlight__wordmark">
                <StudioWordmark id={activeStudio.id} size="lg" />
              </div>
              <p className="sm-spotlight__tagline">{activeStudio.tagline}</p>
              <span className="sm-spotlight__cta">
                <span>Открыть каталог</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            </div>

            <span className="sm-spotlight__hint">
              Крутите колесо вверх/вниз или нажмите на логотип
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default SideMenu;
