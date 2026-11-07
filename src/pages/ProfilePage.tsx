import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import RulesModal from '../components/RulesModal';
import { openSideMenu } from '../components/SideMenu';
import { resolveUserAccess } from '../services/accessControl';
import { getStoredSeason, setStoredSeason, applySeason, detectSeason } from '../services/seasons';
import type { SeasonId } from '../services/seasons';
import './ProfilePage.css';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  sub: string;
  action: () => void;
  highlight?: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const VISUAL_SEASONS: Array<{
  id: SeasonId | 'auto';
  name: string;
  shortName: string;
  sub: string;
  emoji: string;
  accent: string;
}> = [
  {
    id: 'winter',
    name: 'Супер Новогодняя',
    shortName: 'Зима',
    sub: 'Морозный кристалл, Санта и гирлянда',
    emoji: '🎄',
    accent: 'linear-gradient(180deg, #7dd3fc 0%, #c084fc 50%, #f43f5e 100%)',
  },
  {
    id: 'spring',
    name: 'Неоновая Сакура',
    shortName: 'Сакура',
    sub: 'Цветущий Токио и лепестки сакуры',
    emoji: '🌸',
    accent: 'linear-gradient(180deg, #f9a8d4 0%, #ec4899 55%, #a855f7 100%)',
  },
  {
    id: 'summer',
    name: 'Солнечная Лазурь',
    shortName: 'Лазурь',
    sub: 'Бирюзовый океан и золотые блики',
    emoji: '🌞',
    accent: 'linear-gradient(180deg, #fde047 0%, #38bdf8 55%, #0284c7 100%)',
  },
  {
    id: 'autumn',
    name: 'Тёплый Янтарь',
    shortName: 'Янтарь',
    sub: 'Бархатный листопад и уютный свет',
    emoji: '🍁',
    accent: 'linear-gradient(180deg, #fdba74 0%, #f97316 55%, #b45309 100%)',
  },
  {
    id: 'none',
    name: 'Обсидиан PRO',
    shortName: 'PRO',
    sub: 'Эталонный тёмный кинозал',
    emoji: '✦',
    accent: 'linear-gradient(180deg, #d8b4fe 0%, #a855f7 55%, #6366f1 100%)',
  },
  {
    id: 'auto',
    name: 'Авто-сезон',
    shortName: 'Авто',
    sub: `По календарю (${detectSeason().label})`,
    emoji: '⚡',
    accent: 'linear-gradient(180deg, #6ee7b7 0%, #10b981 55%, #0ea5e9 100%)',
  },
];

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, closeApp, haptic, tg } = useTelegram();
  const {
    favorites,
    watchHistory,
    tracked,
    clearHistory,
    isPremium,
    premiumExpiry,
    role,
    telegramUsername,
  } = useStore();
  const [showRules, setShowRules] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<'all' | 'diary' | 'seasons' | 'services'>('all');
  const [diaryTab, setDiaryTab] = useState<'favorites' | 'watching' | 'want' | 'watched'>('favorites');

  /* Сезонное оформление */
  const [seasonState, setSeasonState] = useState(() => getStoredSeason());
  const seasonAuto = seasonState.auto;
  const currentSeasonId = seasonState.season.id;
  const activeChoice: SeasonId | 'auto' = seasonAuto ? 'auto' : currentSeasonId;

  const switchSeason = (id: SeasonId | 'auto') => {
    haptic('medium');
    setStoredSeason(id);
    const next = getStoredSeason();
    applySeason(next.season);
    setSeasonState(next);
  };

  /* Тумблер сезонных эффектов (снег/лепестки/листья) */
  const [fxOff, setFxOff] = useState(() => {
    try { return localStorage.getItem('zenova_fx_off') === '1'; } catch { return false; }
  });

  const toggleFx = () => {
    haptic('medium');
    const next = !fxOff;
    setFxOff(next);
    try { localStorage.setItem('zenova_fx_off', next ? '1' : '0'); } catch {}
    window.dispatchEvent(new CustomEvent('zenova-fx-change'));
  };

  /* Тумблер новогодней гирлянды */
  const [garlandOff, setGarlandOff] = useState(() => {
    try { return localStorage.getItem('zenova_garland_off') === '1'; } catch { return false; }
  });

  const toggleGarland = () => {
    haptic('medium');
    const next = !garlandOff;
    setGarlandOff(next);
    try { localStorage.setItem('zenova_garland_off', next ? '1' : '0'); } catch {}
    window.dispatchEvent(new CustomEvent('zenova-fx-change'));
  };

  const daysLeft = premiumExpiry
    ? Math.max(1, Math.ceil((premiumExpiry - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  const displayName = user ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : 'Киноман ZENOVA';
  const username = user?.username ? `@${user.username}` : (telegramUsername ? `@${telegramUsername}` : '@zenova_member');
  const effectiveUser = user?.username || telegramUsername || '';
  const userAccess = resolveUserAccess(effectiveUser);
  const isAdminUser = userAccess.isAdmin || userAccess.isModerator || role === 'admin' || role === 'moderator' || user?.username === 'ZenovaAdmin';
  const effectivePremium = isPremium || userAccess.isVip;

  /* Кино-ранг и XP прогресс */
  const trackedList = Object.values(tracked || {});
  const trackedCount = trackedList.length;
  const totalXp = watchHistory.length * 45 + favorites.length * 30 + trackedCount * 25 + (effectivePremium ? 250 : 60);
  const cineLevel = Math.min(30, Math.max(1, Math.floor(totalXp / 140) + 1));
  const levelProgress = Math.min(100, Math.round(((totalXp % 140) / 140) * 100));
  const rankTitle =
    cineLevel >= 10
      ? 'Легенда Кинозала'
      : cineLevel >= 6
      ? 'Магистр Кино'
      : cineLevel >= 3
      ? 'Киноэстет PRO'
      : 'Первооткрыватель';

  const heroMaskSrc = seasonState.season.id === 'winter'
    ? '/zenova-mask-winter.png'
    : '/zenova-mask-default.png';

  /* Элементы интерактивного дневника */
  const diaryMovies = (() => {
    if (diaryTab === 'favorites') return favorites;
    return trackedList
      .filter((t) => t.status === diaryTab)
      .map((t) => t.movie);
  })();

  const groups: MenuGroup[] = [
    {
      title: 'ЭКОСИСТЕМА И СЕРВИСЫ ZENOVA',
      items: [
        {
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1">
              <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" />
              <rect x="4" y="18" width="16" height="2" rx="1" />
            </svg>
          ),
          label: effectivePremium ? 'ZENOVA VIP PRO Активен' : 'Оформить ZENOVA PRO',
          sub: effectivePremium ? '4K потоки · Без рекламы · Приоритетный CDN' : 'Без рекламы · 4K HDR · Все привилегии',
          action: () => navigate('/premium'),
          highlight: !effectivePremium,
        },
        {
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
          ),
          label: 'Карусель Кино-Вселенных',
          sub: 'Netflix · Disney+ · HBO Max · Apple TV+ · Marvel · A24',
          action: () => openSideMenu(),
        },
        {
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          ),
          label: 'Музыка ZENOVA PRO',
          sub: 'Мировые хиты · Саундтреки · Моя Волна',
          action: () => navigate('/music'),
        },
        {
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeLinecap="round">
              <path d="M12 3.2 14.1 9.8l6.7 2.2-6.7 2.2L12 20.8l-2.1-6.6L3.2 12l6.7-2.2L12 3.2Z" />
            </svg>
          ),
          label: 'Нейро-подбор КиноИИ',
          sub: 'Персональный подбор фильма под настроение',
          action: () => navigate('/ai'),
        },
        {
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          ),
          label: 'Пользовательское соглашение',
          sub: 'Правила сервиса и защита правообладателей',
          action: () => {
            haptic('light');
            setShowRules(true);
          },
        },
      ],
    },
  ];

  if (isAdminUser) {
    groups.push({
      title: 'АДМИНИСТРИРОВАНИЕ',
      items: [
        {
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="1.9" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          ),
          label: role === 'moderator' && user?.username !== 'ZenovaAdmin' ? 'Панель модератора' : 'Панель администратора',
          sub: 'Управление пользователями и контентом',
          action: () => navigate('/admin'),
        },
      ],
    });
  }

  return (
    <div className="pf page">
      {/* Cyber Blueprint Grid Background */}
      <div className="pf__bg" aria-hidden="true" />

      {/* ═════ 1. TALL ROUNDED PASTEL-LILAC 3D SHOWCASE STAGE (Pinterest 888405463989126482) ═════ */}
      <section className="pf-showcase">
        <div className="pf-stage">
          {/* Top-left cutout notch with circular back button */}
          <div className="pf-stage__notch pf-stage__notch--tl">
            <button
              type="button"
              className="pf-stage__corner-btn"
              onClick={() => {
                haptic('light');
                navigate('/');
              }}
              aria-label="На главную"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Top-right cutout notch with circular VIP/bookmark button */}
          <div className="pf-stage__notch pf-stage__notch--tr">
            <button
              type="button"
              className="pf-stage__corner-btn"
              onClick={() => {
                haptic('medium');
                navigate('/premium');
              }}
              aria-label="PRO Привилегии"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>

          {/* Ambient glow rings inside lilac stage */}
          <div className="pf-stage__halo" aria-hidden="true" />

          {/* Top floating serial badge */}
          <div className="pf-stage__serial">
            <span>ZENOVA EDITION</span>
            <b>#{String(user?.id || 2027).slice(-4).padStart(4, '0')}</b>
          </div>

          {/* 3D Character Mascot Showcase */}
          <div className="pf-stage__figure-wrap">
            <img
              src={heroMaskSrc}
              alt="ZENOVA 3D Character"
              className="pf-stage__figure"
              draggable={false}
            />
            <div className="pf-stage__pedestal-shadow" aria-hidden="true" />
          </div>

          {/* Bottom-left frosted user pill (exact match to Pinterest reference) */}
          <div className="pf-stage__user-pill">
            <div className="pf-stage__user-avatar">
              {user?.photo_url ? (
                <img src={user.photo_url} alt={displayName} />
              ) : (
                <span>{displayName[0]?.toUpperCase() || 'Z'}</span>
              )}
            </div>
            <div className="pf-stage__user-copy">
              <span className="pf-stage__user-handle">{username}</span>
              {(isAdminUser || effectivePremium) && (
                <span className="pf-stage__user-verified">✓ PRO</span>
              )}
            </div>
          </div>

          {/* Bottom-right level tag */}
          <div className="pf-stage__lvl-pill">
            LVL {cineLevel}
          </div>
        </div>

        {/* ═════ 2. DARK SLATE RANK BAR (Current Bid / Rank row from reference) ═════ */}
        <div className="pf-rank-bar">
          <div className="pf-rank-bar__left">
            <span className="pf-rank-bar__diamond" aria-hidden="true">◆</span>
            <span>Current Rank</span>
          </div>
          <div className="pf-rank-bar__right">
            <strong>{rankTitle}</strong>
            <span>{totalXp} XP</span>
          </div>
        </div>

        {/* ═════ 3. 2-COLUMN INFO & DIGITAL TIMER CARD (Name | Ending In + Description) ═════ */}
        <div className="pf-meta-card">
          <div className="pf-meta-card__top">
            <div className="pf-meta-card__col">
              <span className="pf-meta-card__label">Киноман</span>
              <strong className="pf-meta-card__value">{displayName}</strong>
            </div>
            <div className="pf-meta-card__divider" />
            <div className="pf-meta-card__col pf-meta-card__col--right">
              <span className="pf-meta-card__label">
                {effectivePremium ? 'PRO Активен' : 'Статус доступа'}
              </span>
              <strong className="pf-meta-card__clock">
                {effectivePremium
                  ? (daysLeft ? `${String(daysLeft).padStart(2, '0')}d : 24h : 00m` : 'UNLIMITED • 4K')
                  : `0${cineLevel}L : ${String(levelProgress).padStart(2, '0')}% : XP`}
              </strong>
            </div>
          </div>

          <div className="pf-meta-card__desc">
            <div className="pf-meta-card__desc-head">
              <span>Description</span>
              <b>{levelProgress}% до LVL {cineLevel + 1}</b>
            </div>
            <p>
              {effectivePremium
                ? 'Полный доступ к 4K HDR потокам, всем 7 Кино-Вселенным и приоритетному серверу без рекламы.'
                : 'Смотрите фильмы, сохраняйте избранное и повышайте ранг в клубе ZENOVA.'}
            </p>
            <div className="pf-meta-card__xp-track">
              <div className="pf-meta-card__xp-fill" style={{ width: `${levelProgress}%` }} />
            </div>
          </div>
        </div>

        {/* ═════ 4. PILL SLIDER CTA BAR ("Place a bid >>>" style from reference) ═════ */}
        <button
          type="button"
          className="pf-slider-cta"
          onClick={() => {
            haptic('medium');
            navigate('/premium');
          }}
        >
          <span className="pf-slider-cta__pill">
            {effectivePremium ? '👑 VIP Привилегии' : '👑 PRO Доступ'}
          </span>
          <span className="pf-slider-cta__chevrons" aria-hidden="true">
            <i>›</i><i>›</i><i>›</i><i>›</i>
          </span>
        </button>
      </section>

      {/* ═════ 5. DISCOVER HEADER & PILL TABS (Left screen of reference) ═════ */}
      <section className="pf-discover">
        <div className="pf-discover__head">
          <h2 className="pf-discover__title">Коллекция и Студия</h2>
          <button
            type="button"
            className="pf-discover__icon-btn"
            onClick={() => {
              haptic('light');
              navigate('/favorites');
            }}
            aria-label="Открыть избранное"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H8M17 7V16" />
            </svg>
          </button>
        </div>

        <div className="pf-pill-tabs">
          {([
            { id: 'all', label: 'Все' },
            { id: 'diary', label: 'Дневник' },
            { id: 'seasons', label: 'Сезоны' },
            { id: 'services', label: 'Сервисы' },
          ] as const).map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              className={`pf-pill-tab ${sectionFilter === tabItem.id ? 'active' : ''}`}
              onClick={() => {
                haptic('light');
                setSectionFilter(tabItem.id);
              }}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {/* ═════ 6. 2×2 VIBRANT PASTEL-NEON BENTO GRID (Exact match to left screen of reference) ═════ */}
        {sectionFilter === 'all' && (
          <div className="pf-neon-grid">
            {/* Card 1: Pastel Lime-Yellow */}
            <button
              type="button"
              className="pf-neon-card pf-neon-card--lime"
              onClick={() => {
                haptic('light');
                navigate('/favorites');
              }}
            >
              <div className="pf-neon-card__top">
                <span className="pf-neon-card__stat">
                  <i>🎬</i> {watchHistory.length}
                </span>
                <span className="pf-neon-card__arrow">↗</span>
              </div>
              <div className="pf-neon-card__art">🎞️</div>
              <div className="pf-neon-card__bottom">
                <strong>Просмотрено</strong>
                <span>История кинозала</span>
              </div>
            </button>

            {/* Card 2: Pastel Pink-Rose */}
            <button
              type="button"
              className="pf-neon-card pf-neon-card--pink"
              onClick={() => {
                haptic('light');
                navigate('/favorites');
              }}
            >
              <div className="pf-neon-card__top">
                <span className="pf-neon-card__stat">
                  <i>❤️</i> {favorites.length}
                </span>
                <span className="pf-neon-card__arrow">↗</span>
              </div>
              <div className="pf-neon-card__art">💎</div>
              <div className="pf-neon-card__bottom">
                <strong>Избранное</strong>
                <span>Золотая коллекция</span>
              </div>
            </button>

            {/* Card 3: Pastel Cyan-Mint */}
            <button
              type="button"
              className="pf-neon-card pf-neon-card--mint"
              onClick={() => {
                haptic('medium');
                openSideMenu();
              }}
            >
              <div className="pf-neon-card__top">
                <span className="pf-neon-card__stat">
                  <i>🌐</i> 7 миров
                </span>
                <span className="pf-neon-card__arrow">↗</span>
              </div>
              <div className="pf-neon-card__art">🪐</div>
              <div className="pf-neon-card__bottom">
                <strong>Вселенные</strong>
                <span>Netflix · Disney+ · HBO</span>
              </div>
            </button>

            {/* Card 4: Pastel Violet-Sky */}
            <button
              type="button"
              className="pf-neon-card pf-neon-card--violet"
              onClick={() => {
                haptic('medium');
                navigate('/new-year');
              }}
            >
              <div className="pf-neon-card__top">
                <span className="pf-neon-card__stat">
                  <i>🎄</i> 2027
                </span>
                <span className="pf-neon-card__arrow">↗</span>
              </div>
              <div className="pf-neon-card__art">✨</div>
              <div className="pf-neon-card__bottom">
                <strong>Марафон</strong>
                <span>Новогодняя рулетка</span>
              </div>
            </button>
          </div>
        )}
      </section>

      {/* ═════ 7. VERTICAL OVAL CAPSULES — SEASONAL STUDIO (Right screen of reference) ═════ */}
      {(sectionFilter === 'all' || sectionFilter === 'seasons') && (
        <section className="pf-section">
          <div className="pf-section__head">
            <h3 className="pf-section__title">Сезонная Атмосфера</h3>
            <span className="pf-section__sub">{seasonState.season.label}</span>
          </div>

          <div className="pf-capsules-rail">
            {VISUAL_SEASONS.map((s) => {
              const isSelected = activeChoice === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`pf-capsule ${isSelected ? 'active' : ''}`}
                  style={{ '--cap-accent': s.accent } as React.CSSProperties}
                  onClick={() => switchSeason(s.id)}
                >
                  <span className="pf-capsule__orb">{s.emoji}</span>
                  <span className="pf-capsule__chevrons" aria-hidden="true">
                    <i>⌃</i>
                    <i>⌃</i>
                    <i>⌃</i>
                  </span>
                  <span className="pf-capsule__name">{s.shortName}</span>
                </button>
              );
            })}
          </div>

          <div className="pf-season-controls">
            <button
              type="button"
              className={`pf__season-toggle ${fxOff ? '' : 'on'}`}
              onClick={toggleFx}
            >
              <span className="pf__season-toggle__track">
                <span className="pf__season-toggle__thumb" />
              </span>
              <span className="pf__season-toggle__label">
                {fxOff ? '❄️ 3D-снегопад и частицы выключены' : '❄️ 3D-снегопад, кристаллы и лепестки включены'}
              </span>
            </button>

            {seasonState.season.id === 'winter' && (
              <button
                type="button"
                className={`pf__season-toggle ${garlandOff ? '' : 'on'}`}
                onClick={toggleGarland}
              >
                <span className="pf__season-toggle__track">
                  <span className="pf__season-toggle__thumb" />
                </span>
                <span className="pf__season-toggle__label">
                  {garlandOff ? '💡 Новогодняя гирлянда скрыта' : '💡 Светящаяся новогодняя гирлянда включена'}
                </span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* ═════ 8. INTERACTIVE DIARY & WATCHLIST ═════ */}
      {(sectionFilter === 'all' || sectionFilter === 'diary') && (
        <section className="pf-section">
          <div className="pf-section__head">
            <h3 className="pf-section__title">Кино-Дневник</h3>
            <button
              type="button"
              className="pf-section__link"
              onClick={() => navigate('/favorites')}
            >
              Все списки →
            </button>
          </div>

          <div className="pf__diary-box">
            <div className="pf__diary-tabs">
              {([
                { id: 'favorites', label: 'Избранное', count: favorites.length },
                { id: 'watching', label: 'Смотрю', count: trackedList.filter((t) => t.status === 'watching').length },
                { id: 'want', label: 'В планах', count: trackedList.filter((t) => t.status === 'want').length },
                { id: 'watched', label: 'Просмотрено', count: trackedList.filter((t) => t.status === 'watched').length },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`pf__diary-tab ${diaryTab === t.id ? 'active' : ''}`}
                  onClick={() => {
                    haptic('light');
                    setDiaryTab(t.id);
                  }}
                >
                  <span>{t.label}</span>
                  <b>{t.count}</b>
                </button>
              ))}
            </div>

            {diaryMovies.length === 0 ? (
              <div className="pf__diary-empty">
                <span>В этом списке пока пусто — добавляйте фильмы и сериалы со страницы любого тайтла</span>
              </div>
            ) : (
              <div className="pf__diary-scroll">
                {diaryMovies.slice(0, 12).map((m) => (
                  <div
                    key={m.id}
                    className="pf__diary-card"
                    onClick={() => {
                      haptic('light');
                      navigate(`/movie/${m.id}`);
                    }}
                  >
                    <div className="pf__diary-poster">
                      <img src={m.poster_path || ''} alt={m.title} loading="lazy" />
                      {m.vote_average > 0 && (
                        <span className="pf__diary-rate">★ {m.vote_average.toFixed(1)}</span>
                      )}
                    </div>
                    <span className="pf__diary-name">{m.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═════ 9. SERVICES & ADMIN MENU ═════ */}
      {(sectionFilter === 'all' || sectionFilter === 'services') && (
        <div className="pf__groups">
          {groups.map((grp, gIdx) => (
            <div key={gIdx} className="pf__group">
              <div className="pf__group-title">{grp.title}</div>
              <div className="pf__group-box">
                {grp.items.map((item, iIdx) => (
                  <button
                    key={iIdx}
                    className={`pf__row ${item.highlight ? 'pf__row--highlight' : ''}`}
                    onClick={item.action}
                  >
                    <div className="pf__icon-box">
                      {item.icon}
                    </div>
                    <div className="pf__row-content">
                      <div className="pf__row-text">
                        <span className="pf__row-label">{item.label}</span>
                        <span className="pf__row-sub">{item.sub}</span>
                      </div>
                      <span className="pf__arrow">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Недавно смотрели */}
      {watchHistory.length > 0 && sectionFilter === 'all' && (
        <div className="pf-section">
          <div className="pf-section__head">
            <h3 className="pf-section__title">Недавно смотрели</h3>
            <button className="pf__clear-btn" onClick={clearHistory}>
              Очистить
            </button>
          </div>
          <div className="pf__history-scroll">
            {watchHistory.slice(0, 8).map((item) => (
              <div
                key={item.movie.id}
                className="pf__hist-card"
                onClick={() => navigate(`/movie/${item.movie.id}`)}
              >
                <div className="pf__hist-poster">
                  <img src={item.movie.poster_path || ''} alt="" loading="lazy" />
                </div>
                <span className="pf__hist-title">{item.movie.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tg && (
        <div className="pf__exit-wrap">
          <button className="pf__close-btn" onClick={closeApp}>
            Закрыть приложение
          </button>
        </div>
      )}

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      <div className="pf__footer">ZENOVA PRO · DIGITAL CINEMA CLUB</div>
    </div>
  );
};

export default ProfilePage;
