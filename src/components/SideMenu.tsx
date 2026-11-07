import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { STUDIO_WORLDS, discoverMovies } from '../api/catalog';
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

const SEASON_CARDS: Array<{
  id: SeasonId | 'auto';
  label: string;
  sub: string;
  icon: string;
  gradient: string;
  border: string;
  dot: string;
}> = [
  {
    id: 'winter',
    label: 'Новогодняя PRO',
    sub: 'Морозный лёд, гирлянды и Санта',
    icon: '🎄',
    gradient: 'linear-gradient(135deg, rgba(14, 165, 233, 0.34) 0%, rgba(244, 63, 94, 0.25) 55%, rgba(250, 204, 21, 0.22) 100%)',
    border: 'rgba(125, 211, 252, 0.55)',
    dot: '#38bdf8',
  },
  {
    id: 'spring',
    label: 'Неоновая Сакура',
    sub: 'Лепестки Токио и розовый неон',
    icon: '🌸',
    gradient: 'linear-gradient(135deg, rgba(244, 114, 182, 0.34) 0%, rgba(192, 132, 252, 0.24) 100%)',
    border: 'rgba(244, 114, 182, 0.55)',
    dot: '#f472b6',
  },
  {
    id: 'summer',
    label: 'Солнечная Лазурь',
    sub: 'Океанский бриз и золотой закат',
    icon: '🌞',
    gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.32) 0%, rgba(6, 182, 212, 0.28) 100%)',
    border: 'rgba(251, 191, 36, 0.55)',
    dot: '#fbbf24',
  },
  {
    id: 'autumn',
    label: 'Тёплый Янтарь',
    sub: 'Уютный камин и золотая листва',
    icon: '🍁',
    gradient: 'linear-gradient(135deg, rgba(249, 115, 22, 0.34) 0%, rgba(180, 83, 9, 0.26) 100%)',
    border: 'rgba(251, 146, 60, 0.55)',
    dot: '#fb923c',
  },
  {
    id: 'none',
    label: 'Обсидиан PRO',
    sub: 'Фирменный тёмный кинозал',
    icon: '✦',
    gradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.26) 0%, rgba(30, 27, 46, 0.65) 100%)',
    border: 'rgba(251, 113, 133, 0.48)',
    dot: '#fb7185',
  },
  {
    id: 'auto',
    label: 'Авто-сезон',
    sub: 'Синхронизация с календарём',
    icon: '⚡',
    gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.28) 0%, rgba(56, 189, 248, 0.24) 100%)',
    border: 'rgba(52, 211, 153, 0.5)',
    dot: '#34d399',
  },
];

export const SideMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [rollingRandom, setRollingRandom] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { favorites, tracked, watchHistory, isPremium } = useStore();
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

  const handleQuickRandomMovie = async () => {
    if (rollingRandom) return;
    haptic('medium');
    setRollingRandom(true);
    try {
      const page = 1 + Math.floor(Math.random() * 6);
      const res = await discoverMovies({ page });
      const pool = (res.results || []).filter((m) => m.poster_path && (m.vote_average || 0) >= 6.4);
      if (pool.length > 0) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        setOpen(false);
        navigate(`/movie/${pick.id}`);
      }
    } catch {
      setOpen(false);
      navigate('/ai');
    } finally {
      setRollingRandom(false);
    }
  };

  if (!open) return null;

  const activeChoice: SeasonId | 'auto' = seasonState.auto ? 'auto' : seasonState.season.id;
  const trackedItems = Object.values(tracked || {});
  const watchedCount = trackedItems.filter((t) => t.status === 'watched').length || watchHistory.length;
  const wantCount = trackedItems.filter((t) => t.status === 'want').length;

  return (
    <div
      className="sm-overlay"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Боковое меню ZENOVA"
    >
      <aside className="sm-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="sm-ambient-glow" aria-hidden="true" />

        {/* ── Шапка бокового меню ── */}
        <div className="sm-head">
          <div className="sm-brand" onClick={() => go('/')}>
            <VeloraEmblem size="sm" />
            <div className="sm-brand__text">
              <div className="sm-brand__row">
                <span className="sm-brand__name">ZENOVA</span>
                <span className="sm-brand__pro">PRO</span>
              </div>
              <span className="sm-brand__tag">CINEMA • SOUND • AI</span>
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Голографическая карточка профиля со статистикой ── */}
        <div className="sm-hero-card">
          <button type="button" className="sm-profile-top" onClick={() => go('/profile')}>
            <div className="sm-profile-card__avatar">
              {tgUser?.photo_url ? (
                <img src={tgUser.photo_url} alt="" />
              ) : (
                <span>{(tgUser?.first_name || 'Z')[0]?.toUpperCase()}</span>
              )}
              <span className="sm-profile-card__online" />
            </div>
            <div className="sm-profile-card__info">
              <div className="sm-profile-card__name-row">
                <span className="sm-profile-card__name">
                  {tgUser?.first_name || 'Киноман ZENOVA'}
                </span>
                <span className="sm-profile-card__vip">
                  {isPremium ? 'VIP' : 'PRO'}
                </span>
              </div>
              <span className="sm-profile-card__status">
                Личный кабинет, дневник и достижения
              </span>
            </div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <div className="sm-stats-strip">
            <button type="button" className="sm-stat-pill" onClick={() => go('/profile')}>
              <b>{watchedCount}</b>
              <span>Просмотрено</span>
            </button>
            <button type="button" className="sm-stat-pill" onClick={() => go('/favorites')}>
              <b>{favorites.length}</b>
              <span>Избранное</span>
            </button>
            <button type="button" className="sm-stat-pill" onClick={() => go('/profile')}>
              <b>{wantCount}</b>
              <span>В планах</span>
            </button>
          </div>
        </div>

        <div className="sm-scroll">
          {/* ── Быстрые супер-фишки (Bento Actions) ── */}
          <div className="sm-bento-actions">
            <button
              type="button"
              className="sm-bento-btn sm-bento-btn--ny"
              onClick={() => go('/new-year')}
            >
              <img src="/zenova-mask-winter.png" alt="" className="sm-bento-btn__mascot" />
              <div className="sm-bento-btn__copy">
                <span className="sm-bento-btn__kicker">🎄 HOLIDAY</span>
                <span className="sm-bento-btn__title">Новогодний марафон</span>
              </div>
            </button>

            <button
              type="button"
              className="sm-bento-btn sm-bento-btn--lucky"
              onClick={handleQuickRandomMovie}
              disabled={rollingRandom}
            >
              <span className="sm-bento-btn__dice">{rollingRandom ? '⏳' : '🎲'}</span>
              <div className="sm-bento-btn__copy">
                <span className="sm-bento-btn__kicker">КИНО-РУЛЕТКА</span>
                <span className="sm-bento-btn__title">
                  {rollingRandom ? 'Подбираем...' : 'Случайный фильм'}
                </span>
              </div>
            </button>
          </div>

          {/* ── Выберите сезонную тему (Красивые визуальные карточки с градиентами) ── */}
          <div className="sm-section">
            <div className="sm-section__head">
              <span className="sm-section__title">🎨 ТЕМА И АТМОСФЕРА</span>
              <button
                type="button"
                className={`sm-fx-switch ${fxOn ? 'on' : ''}`}
                onClick={toggleFx}
                title="Включить/выключить падающий снег или лепестки"
              >
                <span className="sm-fx-switch__dot" />
                <span>{fxOn ? '✨ Спецэффекты ВКЛ' : 'Спецэффекты ВЫКЛ'}</span>
              </button>
            </div>

            <div className="sm-themes-grid">
              {SEASON_CARDS.map((s) => {
                const active = activeChoice === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`sm-theme-card ${active ? 'active' : ''}`}
                    style={
                      {
                        '--tc-bg': s.gradient,
                        '--tc-border': s.border,
                        '--tc-dot': s.dot,
                      } as React.CSSProperties
                    }
                    onClick={() => handleSelectSeason(s.id)}
                  >
                    <div className="sm-theme-card__top">
                      <span className="sm-theme-card__icon">{s.icon}</span>
                      {active ? (
                        <span className="sm-theme-card__check">✓ Активна</span>
                      ) : (
                        <span className="sm-theme-card__orb" />
                      )}
                    </div>
                    <span className="sm-theme-card__title">{s.label}</span>
                    <span className="sm-theme-card__sub">{s.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Кино-Миры и Студии (СПИСКОМ с настоящими фирменными надписями) ── */}
          <div className="sm-section">
            <div className="sm-section__head">
              <span className="sm-section__title">🎬 КИНО-МИРЫ И СТУДИИ</span>
              <span className="sm-section__count">{STUDIO_WORLDS.length} платформ</span>
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

          {/* ── Быстрая навигация по разделам ── */}
          <div className="sm-section">
            <span className="sm-section__title">🧭 РАЗДЕЛЫ ПРИЛОЖЕНИЯ</span>
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
                <span className="sm-nav-item__tag">AI PRO</span>
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
                className={`sm-nav-item ${location.pathname === '/feed' ? 'active' : ''}`}
                onClick={() => go('/feed')}
              >
                <span className="sm-nav-item__icon">✦</span>
                <span className="sm-nav-item__label">Что нового в ZENOVA</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default SideMenu;
