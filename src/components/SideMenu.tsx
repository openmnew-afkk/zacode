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
  const didDragRef = useRef<boolean>(false);
  const edgeSwipeStartX = useRef<number | null>(null);
  const edgeSwipeStartY = useRef<number | null>(null);
  const wheelLock = useRef<boolean>(false);

  const count = STUDIO_WORLDS.length;

  useEffect(() => {
    const onOpen = () => {
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

  // Global left-edge swipe gesture to open the roulette effortlessly
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
      if (dx > 34 && dx > dy * 1.35) {
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

  const stepWheel = (delta: number) => {
    haptic('light');
    setActiveIdx((prev) => (prev + delta + count) % count);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchAccumY.current = 0;
    didDragRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const dy = currentY - touchStartY.current;
    touchAccumY.current += dy;
    touchStartY.current = currentY;

    if (Math.abs(touchAccumY.current) > 10) {
      didDragRef.current = true;
    }

    const threshold = 38;
    if (Math.abs(touchAccumY.current) >= threshold) {
      const steps = Math.trunc(touchAccumY.current / threshold);
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
    if (Math.abs(e.deltaY) < 8) return;
    wheelLock.current = true;
    stepWheel(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => {
      wheelLock.current = false;
    }, 130);
  };

  const openStudio = (studioId: string, idx?: number) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    if (typeof idx === 'number') setActiveIdx(idx);
    haptic('medium');
    setOpen(false);
    navigate(`/studios/${studioId}`);
  };

  const activeStudio = STUDIO_WORLDS[activeIdx] || STUDIO_WORLDS[0];

  const getSignedOffset = (index: number) => {
    let diff = (index - activeIdx) % count;
    if (diff > count / 2) diff -= count;
    if (diff < -count / 2) diff += count;
    return diff;
  };

  // Hide the floating edge trigger on movie detail player page so it never overlaps video
  const hideEdgeTab = location.pathname.startsWith('/movie/');

  return (
    <>
      {/* ── Ultra-Minimalist Left-Edge Capsule Trigger (middle of the screen) ── */}
      {!open && !hideEdgeTab && (
        <button
          type="button"
          className="sm-edge-tab"
          onClick={() => {
            haptic('light');
            setOpen(true);
          }}
          aria-label="Открыть рулетку кино-вселенных"
          title="Кино-Вселенные"
        >
          <span className="sm-edge-tab__line" aria-hidden="true" />
        </button>
      )}

      {/* ── Color-Shifting Curved Studio Wordmark Roulette ── */}
      {open && (
        <div
          className="sm-overlay"
          style={
            {
              '--st-accent': activeStudio.accentColor,
              '--st-glow': activeStudio.glowColor,
            } as React.CSSProperties
          }
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Рулетка Кино-Вселенных"
        >
          {/* Dynamic Color-Shifting Ambient Aura matching active studio */}
          <div className="sm-color-aura" aria-hidden="true" />

          <div
            className="sm-arc-scene"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {/* Precision Curved Glass Dial SVG with Dynamic Color-Shifting Neon Rim */}
            <svg
              className="sm-dial-svg"
              viewBox="0 0 380 640"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="smDialGlass" cx="0%" cy="50%" r="88%">
                  <stop offset="0%" stopColor={activeStudio.accentColor} stopOpacity="0.24" />
                  <stop offset="48%" stopColor="#12121c" stopOpacity="0.95" />
                  <stop offset="92%" stopColor="#09090e" stopOpacity="0.92" />
                  <stop offset="100%" stopColor="#09090e" stopOpacity="0" />
                </radialGradient>

                <linearGradient id="smOrbitStroke" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
                  <stop offset="22%" stopColor={activeStudio.accentColor} stopOpacity="0.35" />
                  <stop offset="50%" stopColor={activeStudio.accentColor} stopOpacity="1" />
                  <stop offset="78%" stopColor={activeStudio.accentColor} stopOpacity="0.35" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
                </linearGradient>
              </defs>

              {/* Sculpted semi-circular dark glass body */}
              <circle cx="-55" cy="320" r="286" fill="url(#smDialGlass)" />

              {/* Outer color-shifting hairline rim */}
              <circle
                cx="-55"
                cy="320"
                r="286"
                stroke="url(#smOrbitStroke)"
                strokeWidth="1.4"
              />

              {/* Watchmaker degree ticks ring */}
              <circle
                cx="-55"
                cy="320"
                r="242"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="4"
                strokeDasharray="1.5 8"
              />

              {/* Main glowing orbital arc */}
              <circle
                cx="-55"
                cy="320"
                r="192"
                stroke="url(#smOrbitStroke)"
                strokeWidth="2.2"
              />

              {/* Inner core ring */}
              <circle
                cx="-55"
                cy="320"
                r="112"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="1"
              />
            </svg>

            {/* Inner Hub Core (Left inside the semi-circle) */}
            <div className="sm-hub-core">
              <span className="sm-hub-core__dot" />
              <span className="sm-hub-core__count">
                0{activeIdx + 1} <i>/ 0{count}</i>
              </span>
              <span className="sm-hub-core__name">{activeStudio.name}</span>
              <span className="sm-hub-core__sub">Нажмите на студию</span>
            </div>

            {/* Curved Roulette of Direct One-Tap Studio Wordmark Buttons */}
            <div className="sm-wordmarks-layer">
              {STUDIO_WORLDS.map((st, idx) => {
                const offset = getSignedOffset(idx);
                const isCenter = offset === 0;
                // Spread studio wordmark buttons along the curved arc
                const angleDeg = offset * 21;
                const angleRad = (angleDeg * Math.PI) / 180;
                const radius = 192;
                const x = Math.round(-55 + Math.cos(angleRad) * radius);
                const y = Math.round(Math.sin(angleRad) * radius);
                const scale = isCenter ? 1.08 : Math.max(0.76, 0.94 - Math.abs(offset) * 0.08);
                const opacity = Math.abs(offset) > 3 ? 0 : Math.max(0.32, 1 - Math.abs(offset) * 0.22);

                return (
                  <button
                    key={st.id}
                    type="button"
                    className={`sm-wordmark-btn sm-wordmark-btn--${st.id} ${isCenter ? 'is-active' : ''}`}
                    style={
                      {
                        '--w-x': `${x}px`,
                        '--w-y': `${y}px`,
                        '--w-scale': scale,
                        '--w-opacity': opacity,
                        '--w-rot': `${offset * 5.5}deg`,
                        '--w-accent': st.accentColor,
                        '--w-glow': st.glowColor,
                        zIndex: 10 - Math.abs(offset),
                      } as React.CSSProperties
                    }
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => openStudio(st.id, idx)}
                    aria-label={`Перейти в раздел ${st.name}`}
                  >
                    <span className="sm-wordmark-btn__glow" aria-hidden="true" />
                    <span className="sm-wordmark-btn__logo">
                      <StudioWordmark id={st.id} size="md" />
                    </span>
                    <span className="sm-wordmark-btn__arrow" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Subtle Close Button */}
            <button
              type="button"
              className="sm-arc-close"
              onClick={() => {
                haptic('light');
                setOpen(false);
              }}
              aria-label="Закрыть"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SideMenu;
