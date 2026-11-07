import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { STUDIO_WORLDS } from '../api/catalog';
import {
  getStoredSeason,
  setStoredSeason,
  applySeason,
  type SeasonId,
} from '../services/seasons';
import { useStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import VeloraEmblem from './VeloraEmblem';
import StudioWordmark from './StudioWordmark';
import './SideMenu.css';

export const openSideMenu = () => {
  window.dispatchEvent(new CustomEvent('zenova-open-drawer'));
};

const SEASON_CHOICES: Array<{ id: SeasonId | 'auto'; label: string; icon: string }> = [
  { id: 'auto', label: 'Авто', icon: '⚡' },
  { id: 'winter', label: 'Новогодняя', icon: '🎄' },
  { id: 'spring', label: 'Сакура', icon: '🌸' },
  { id: 'summer', label: 'Лазурь', icon: '🌞' },
  { id: 'autumn', label: 'Янтарь', icon: '🍁' },
  { id: 'none', label: 'Классика', icon: '✦' },
];

export const SideMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites, isPremium } = useStore();
  const { user: tgUser, haptic } = useTelegram();

  const [seasonState, setSeasonState] = useState(() => getStoredSeason());
  const [fxOn, setFxOn] = useState(() => {
    try {
      return localStorage.getItem('zenova_fx_off') !== '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    const onSeason = () => setSeasonState(getStoredSeason());
    const onFx = () => {
      try {
        setFxOn(localStorage.getItem('zenova_fx_off') !== '1');
      } catch {
        setFxOn(true);
      }
    };

    window.addEventListener('zenova-open-drawer', onOpen);
    window.addEventListener('zenova-close-drawer', onClose);
    window.addEventListener('zenova-season-change', onSeason);
    window.addEventListener('zenova-fx-change', onFx);

    return () => {
      window.removeEventListener('zenova-open-drawer', onOpen);
      window.removeEventListener('zenova-close-drawer', onClose);
      window.removeEventListener('zenova-season-change', onSeason);
      window.removeEventListener('zenova-fx-change', onFx);
    };
  }, []);

  // Закрываем меню при смене маршрута
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const go = (path: string) => {
    haptic('light');
    setOpen(false);
    navigate(path);
  };

  const handleSelectSeason = (choice: SeasonId | 'auto') => {
    haptic('medium');
    setStoredSeason(choice);
    const next = getStoredSeason();
    applySeason(next.season);
    setSeasonState(next);
  };

  const toggleFx = () => {
    haptic('light');
    const next = !fxOn;
    setFxOn(next);
    try {
      localStorage.setItem('zenova_fx_off', next ? '0' : '1');
    } catch {}
    window.dispatchEvent(new CustomEvent('zenova-fx-change'));
  };

  if (!open) return null;

  const activeChoice: SeasonId | 'auto' = seasonState.auto ? 'auto' : seasonState.season.id;

  return (
    <div
      className="sm-overlay"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Боковое меню ZENOVA"
    >
      <aside className="sm-drawer" onClick={(e) => e.stopPropagation()}>
        {/* ── Шапка бокового меню ── */}
        <div className="sm-head">
          <div className="sm-brand" onClick={() => go('/')}>
            <VeloraEmblem size="sm" />
            <div className="sm-brand__text">
              <span className="sm-brand__name">ZENOVA</span>
              <span className="sm-brand__tag">CINEMA &amp; SOUND PRO</span>
            </div>
          </div>
          <button
            type="button"
            className="sm-close"
            onClick={() => {
              haptic('light');
              setOpen(false);
            }}
            aria-label="Закрыть меню"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Карточка мини-профиля ── */}
        <button type="button" className="sm-profile-card" onClick={() => go('/profile')}>
          <div className="sm-profile-card__avatar">
            {tgUser?.photo_url ? (
              <img src={tgUser.photo_url} alt="" />
            ) : (
              <span>{(tgUser?.first_name || 'Z')[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="sm-profile-card__info">
            <span className="sm-profile-card__name">
              {tgUser?.first_name || 'Киноман ZENOVA'}
            </span>
            <span className="sm-profile-card__status">
              {isPremium ? '✦ ZENOVA VIP PRO' : 'Открыть профиль и настройки'}
            </span>
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <div className="sm-scroll">
          {/* ── Быстрая навигация по разделам ── */}
          <div className="sm-section">
            <span className="sm-section__title">РАЗДЕЛЫ ПРИЛОЖЕНИЯ</span>
            <div className="sm-nav-list">
              <button
                type="button"
                className={`sm-nav-item ${location.pathname === '/favorites' ? 'active' : ''}`}
                onClick={() => go('/favorites')}
              >
                <span className="sm-nav-item__icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <span className="sm-nav-item__label">Мои списки и Избранное</span>
                {favorites.length > 0 && (
                  <span className="sm-nav-item__badge">{favorites.length}</span>
                )}
              </button>

              <button
                type="button"
                className={`sm-nav-item ${location.pathname === '/ai' ? 'active' : ''}`}
                onClick={() => go('/ai')}
              >
                <span className="sm-nav-item__icon sm-nav-item__icon--rose">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l2.1 6.4L20.5 12l-6.4 2.6L12 21l-2.1-6.4L3.5 12l6.4-2.6L12 3z" />
                  </svg>
                </span>
                <span className="sm-nav-item__label">КиноИИ — Нейроподбор</span>
                <span className="sm-nav-item__tag">PRO</span>
              </button>

              <button
                type="button"
                className={`sm-nav-item ${location.pathname === '/music' ? 'active' : ''}`}
                onClick={() => go('/music')}
              >
                <span className="sm-nav-item__icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </span>
                <span className="sm-nav-item__label">Моя Волна • Музыка</span>
              </button>

              <button
                type="button"
                className={`sm-nav-item ${location.pathname === '/new-year' ? 'active' : ''}`}
                onClick={() => go('/new-year')}
              >
                <span className="sm-nav-item__icon">🎄</span>
                <span className="sm-nav-item__label">Новогодний марафон</span>
              </button>

              <button
                type="button"
                className={`sm-nav-item ${location.pathname === '/feed' ? 'active' : ''}`}
                onClick={() => go('/feed')}
              >
                <span className="sm-nav-item__icon">✦</span>
                <span className="sm-nav-item__label">Что нового в ZENOVA</span>
              </button>
            </div>
          </div>

          {/* ── Кино-Миры и Студии (СПИСКОМ с настоящими фирменными надписями) ── */}
          <div className="sm-section">
            <div className="sm-section__head">
              <span className="sm-section__title">КИНО-МИРЫ И СТУДИИ</span>
              <span className="sm-section__count">{STUDIO_WORLDS.length} миров</span>
            </div>
            <div className="sm-studios-list">
              {STUDIO_WORLDS.map((st) => {
                const isCurrent = location.pathname === `/studios/${st.id}`;
                return (
                  <button
                    key={st.id}
                    type="button"
                    className={`sm-studio-row sm-studio-row--${st.id} ${isCurrent ? 'active' : ''}`}
                    style={
                      {
                        '--st-accent': st.accentColor,
                        '--st-glow': st.glowColor,
                      } as React.CSSProperties
                    }
                    onClick={() => go(`/studios/${st.id}`)}
                  >
                    <div className="sm-studio-row__logo">
                      <StudioWordmark id={st.id} size="sm" />
                    </div>
                    <div className="sm-studio-row__meta">
                      <span className="sm-studio-row__tagline">{st.tagline}</span>
                    </div>
                    <span className="sm-studio-row__chev" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Сезонная атмосфера ── */}
          <div className="sm-section">
            <div className="sm-section__head">
              <span className="sm-section__title">СЕЗОННАЯ ТЕМА</span>
              <button
                type="button"
                className={`sm-fx-toggle ${fxOn ? 'on' : ''}`}
                onClick={toggleFx}
              >
                <span>{fxOn ? '✨ Частицы ВКЛ' : 'Частицы ВЫКЛ'}</span>
              </button>
            </div>
            <div className="sm-seasons-grid">
              {SEASON_CHOICES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`sm-season-pill ${activeChoice === s.id ? 'active' : ''}`}
                  onClick={() => handleSelectSeason(s.id)}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default SideMenu;
