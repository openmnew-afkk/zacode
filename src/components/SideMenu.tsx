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

  // Global left-edge swipe gesture to open the wheel effortlessly
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
      if (dx > 36 && dx > dy * 1.4) {
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
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const dy = currentY - touchStartY.current;
    touchAccumY.current += dy;
    touchStartY.current = currentY;

    const threshold = 40;
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
    }, 140);
  };

  const openStudio = (studioId: string) => {
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
      {/* ── Minimalist Floating Left-Edge Pull Tab (always discoverable, never intrusive) ── */}
      {!open && !hideEdgeTab && (
        <button
          type="button"
          className="sm-edge-tab"
          onClick={() => {
            haptic('light');
            setOpen(true);
          }}
          aria-label="Открыть рулетку кино-вселенных"
          title="Кино-Вселенные (Netflix, Disney+, HBO, Apple TV+)"
        >
          <span className="sm-edge-tab__glow" aria-hidden="true" />
          <span className="sm-edge-tab__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="sm-edge-tab__chev" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </button>
      )}

      {/* ── Sculptural Curved Arc / Roulette Overlay ── */}
      {open && (
        <div
          className="sm-overlay"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Карусель Кино-Вселенных"
        >
          <div
            className="sm-arc-scene"
            style={
              {
                '--st-accent': activeStudio.accentColor,
                '--st-glow': activeStudio.glowColor,
              } as React.CSSProperties
            }
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {/* Precision Semi-Circular Glass Dial SVG */}
            <svg
              className="sm-dial-svg"
              viewBox="0 0 360 640"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="smDialGlass" cx="0%" cy="50%" r="85%">
                  <stop offset="0%" stopColor="#161622" stopOpacity="0.96" />
                  <stop offset="68%" stopColor="#0d0d15" stopOpacity="0.94" />
                  <stop offset="96%" stopColor="#09090f" stopOpacity="0.88" />
                  <stop offset="100%" stopColor="#09090f" stopOpacity="0" />
                </radialGradient>

                <linearGradient id="smOrbitStroke" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
                  <stop offset="25%" stopColor="rgba(255,255,255,0.16)" />
                  <stop offset="50%" stopColor={activeStudio.accentColor} stopOpacity="0.9" />
                  <stop offset="75%" stopColor="rgba(255,255,255,0.16)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                </linearGradient>
              </defs>

              {/* Sculpted semi-circular dark glass body */}
              <circle cx="-40" cy="320" r="278" fill="url(#smDialGlass)" />

              {/* Outer hairline rim */}
              <circle
                cx="-40"
                cy="320"
                r="278"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />

              {/* Fine watchmaker degree ticks ring */}
              <circle
                cx="-40"
                cy="320"
                r="246"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="5"
                strokeDasharray="1.5 7.5"
              />

              {/* Main orbital arc passing through the studio medallions */}
              <circle
                cx="-40"
                cy="320"
                r="196"
                stroke="url(#smOrbitStroke)"
                strokeWidth="1.8"
              />

              {/* Inner core ring */}
              <circle
                cx="-40"
                cy="320"
                r="128"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            </svg>

            {/* Inner Hub Core (Left inside the semi-circle) */}
            <div className="sm-hub-core" onClick={() => openStudio(activeStudio.id)}>
              <span className="sm-hub-core__count">
                0{activeIdx + 1} <i>/ 0{count}</i>
              </span>
              <span className="sm-hub-core__label">ВСЕЛЕННАЯ</span>
              <span className="sm-hub-core__sub">Крутите дугу</span>
            </div>

            {/* Center 3-o'clock Focus Ring on the Orbital Track */}
            <div className="sm-focus-lens" aria-hidden="true">
              <span className="sm-focus-lens__ring" />
            </div>

            {/* Rotating Studio Medallions along the Curved Arc (cx = -40, R = 196) */}
            <div className="sm-medallions-layer">
              {STUDIO_WORLDS.map((st, idx) => {
                const offset = getSignedOffset(idx);
                const isCenter = offset === 0;
                // Spread items cleanly along the arc (-66deg to +66deg)
                const angleDeg = offset * 23;
                const angleRad = (angleDeg * Math.PI) / 180;
                const radius = 196;
                const x = Math.round(-40 + Math.cos(angleRad) * radius);
                const y = Math.round(Math.sin(angleRad) * radius);
                const scale = isCenter ? 1.16 : Math.max(0.68, 0.92 - Math.abs(offset) * 0.1);
                const opacity = Math.abs(offset) > 3 ? 0 : Math.max(0.28, 1 - Math.abs(offset) * 0.24);

                return (
                  <button
                    key={st.id}
                    type="button"
                    className={`sm-medallion sm-medallion--${st.id} ${isCenter ? 'is-active' : ''}`}
                    style={
                      {
                        '--m-x': `${x}px`,
                        '--m-y': `${y}px`,
                        '--m-scale': scale,
                        '--m-opacity': opacity,
                        '--m-accent': st.accentColor,
                        '--m-glow': st.glowColor,
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
                    <span className="sm-medallion__inner">
                      <StudioWordmark id={st.id} size="sm" />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Minimalist Floating Selection Pill to the right of the Focus Lens */}
            <div className="sm-active-callout">
              <button
                type="button"
                className="sm-active-callout__card"
                onClick={() => openStudio(activeStudio.id)}
              >
                <div className="sm-active-callout__info">
                  <span className="sm-active-callout__kicker">{activeStudio.badgeText}</span>
                  <span className="sm-active-callout__name">{activeStudio.name}</span>
                  <span className="sm-active-callout__tag">{activeStudio.tagline}</span>
                </div>
                <span className="sm-active-callout__go">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
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
