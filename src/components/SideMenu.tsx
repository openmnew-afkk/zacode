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
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();

  const edgeSwipeStartX = useRef<number | null>(null);
  const edgeSwipeStartY = useRef<number | null>(null);

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

  // Автозакрытие при переходе
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Глобальный жест свайпа от левого края экрана для быстрого открытия
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (open || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX <= 28) {
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
      if (dx > 38 && dx > dy * 1.3) {
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

  // Скрываем триггер на странице просмотра фильма, чтобы не перекрывать плеер
  const hideEdgeTab = location.pathname.startsWith('/movie/');

  return (
    <>
      {/* ── Удобная, тактильная плавающая кнопка-капсула на левом краю экрана ── */}
      {!open && !hideEdgeTab && (
        <button
          type="button"
          className="sm-edge-trigger"
          onClick={() => {
            haptic('light');
            setOpen(true);
          }}
          aria-label="Открыть каталог кино-вселенных и студий"
          title="Студии & Вселенные"
        >
          <div className="sm-edge-trigger__body">
            <svg
              className="sm-edge-trigger__icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />
              <path d="M12 3a9 9 0 0 0 0 18" strokeDasharray="2 3" opacity="0.6" />
            </svg>
            <span className="sm-edge-trigger__label">Миры</span>
          </div>
        </button>
      )}

      {/* ── Премиальный боковой портал Вселенных (ZENOVA Multiverse Vault) ── */}
      {open && (
        <div
          className="sm-backdrop"
          onClick={() => {
            haptic('light');
            setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Кино-Вселенные и Студии"
        >
          <div
            className="sm-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Шапка меню */}
            <div className="sm-drawer__head">
              <div className="sm-drawer__title-wrap">
                <span className="sm-drawer__kicker">ZENOVA MULTIVERSE</span>
                <h2 className="sm-drawer__title">Кино-Вселенные</h2>
                <p className="sm-drawer__sub">Эксклюзивные каталоги 10 мировых студий</p>
              </div>
              <button
                type="button"
                className="sm-drawer__close"
                onClick={() => {
                  haptic('light');
                  setOpen(false);
                }}
                aria-label="Закрыть меню"
              >
                ✕
              </button>
            </div>

            {/* Быстрый горизонтальный / вертикальный список премиальных карточек */}
            <div className="sm-drawer__list">
              {STUDIO_WORLDS.map((studio) => {
                const isCurrent = location.pathname === `/studios/${studio.id}`;
                return (
                  <article
                    key={studio.id}
                    className={`sm-card ${isCurrent ? 'is-active' : ''}`}
                    style={
                      {
                        '--st-accent': studio.accentColor,
                        '--st-glow': studio.glowColor,
                      } as React.CSSProperties
                    }
                    onClick={() => selectStudio(studio.id)}
                  >
                    <div className="sm-card__glow-aura" aria-hidden="true" />
                    
                    <div className="sm-card__content">
                      <div className="sm-card__top">
                        <div className="sm-card__wordmark-wrap">
                          <StudioWordmark id={studio.id} size="sm" />
                        </div>
                        <span className="sm-card__badge">{studio.badgeText}</span>
                      </div>

                      <p className="sm-card__tagline">{studio.tagline}</p>
                    </div>

                    <div className="sm-card__arrow" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="sm-drawer__footer">
              <span className="sm-drawer__footer-note">
                ✦ Выберите студию для просмотра персональной витрины
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SideMenu;
