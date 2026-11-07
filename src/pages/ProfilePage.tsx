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
  dotColor: string;
}> = [
  {
    id: 'winter',
    name: 'Зимний Кристалл',
    shortName: 'Зима',
    sub: 'Морозный кристалл и мягкий снег',
    emoji: '❄',
    dotColor: '#7dd3fc',
  },
  {
    id: 'spring',
    name: 'Сакура',
    shortName: 'Весна',
    sub: 'Тонкие лепестки и розовый свет',
    emoji: '❀',
    dotColor: '#f472b6',
  },
  {
    id: 'summer',
    name: 'Лазурь',
    shortName: 'Лето',
    sub: 'Тёплые блики и морской бриз',
    emoji: '☀',
    dotColor: '#fbbf24',
  },
  {
    id: 'autumn',
    name: 'Янтарь',
    shortName: 'Осень',
    sub: 'Бархатный листопад и уютный тон',
    emoji: '✦',
    dotColor: '#fb923c',
  },
  {
    id: 'none',
    name: 'Обсидиан',
    shortName: 'База',
    sub: 'Чистый тёмный кинозал без эффектов',
    emoji: '●',
    dotColor: '#fb7185',
  },
  {
    id: 'auto',
    name: 'Авто-сезон',
    shortName: 'Авто',
    sub: `По календарю (${detectSeason().label})`,
    emoji: '◎',
    dotColor: '#a78bfa',
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
    haptic('light');
    setStoredSeason(id);
    const next = getStoredSeason();
    applySeason(next.season);
    setSeasonState(next);
  };

  /* Тумблер сезонных эффектов */
  const [fxOff, setFxOff] = useState(() => {
    try { return localStorage.getItem('zenova_fx_off') === '1'; } catch { return false; }
  });

  const toggleFx = () => {
    haptic('light');
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
    haptic('light');
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

  const diaryMovies = (() => {
    if (diaryTab === 'favorites') return favorites;
    return trackedList
      .filter((t) => t.status === diaryTab)
      .map((t) => t.movie);
  })();

  const groups: MenuGroup[] = [
    {
      title: 'ЭКОСИСТЕМА ZENOVA',
      items: [
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" />
              <line x1="4" y1="19" x2="20" y2="19" />
            </svg>
          ),
          label: effectivePremium ? 'ZENOVA PRO Активен' : 'Привилегии ZENOVA PRO',
          sub: effectivePremium ? '4K потоки · Без рекламы · Приоритетный доступ' : '4K HDR · Без рекламы · Все возможности',
          action: () => navigate('/premium'),
          highlight: !effectivePremium,
        },
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3.2" />
            </svg>
          ),
          label: 'Кино-Вселенные',
          sub: 'Netflix · Disney+ · HBO Max · Apple TV+ · Marvel · A24',
          action: () => openSideMenu(),
        },
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          ),
          label: 'Музыка и Саундтреки',
          sub: 'Мировые хиты · Саундтреки · Моя Волна',
          action: () => navigate('/music'),
        },
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M12 3.2 14.1 9.8l6.7 2.2-6.7 2.2L12 20.8l-2.1-6.6L3.2 12l6.7-2.2L12 3.2Z" />
            </svg>
          ),
          label: 'Нейро-подбор КиноИИ',
          sub: 'Персональный подбор фильма под настроение',
          action: () => navigate('/ai'),
        },
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          ),
          label: 'Пользовательское соглашение',
          sub: 'Правила сервиса и информация для правообладателей',
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
      title: 'УПРАВЛЕНИЕ',
      items: [
        {
          icon: (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          ),
          label: role === 'moderator' && user?.username !== 'ZenovaAdmin' ? 'Панель модератора' : 'Панель администратора',
          sub: 'Управление пользователями и каталогом',
          action: () => navigate('/admin'),
        },
      ],
    });
  }

  return (
    <div className="pf page">
      <div className="pf__bg" aria-hidden="true" />

      {/* ═════ 1. MINIMALIST DARK-OBSIDIAN 3D SHOWCASE STAGE ═════ */}
      <section className="pf-showcase">
        <div className="pf-stage">
          {/* Top-left notched corner button */}
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
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Top-right notched corner button */}
          <div className="pf-stage__notch pf-stage__notch--tr">
            <button
              type="button"
              className="pf-stage__corner-btn"
              onClick={() => {
                haptic('light');
                navigate('/favorites');
              }}
              aria-label="Избранное"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>

          {/* Subtle Concentric Rings */}
          <div className="pf-stage__halo" aria-hidden="true" />

          {/* Top Minimalist Serial Tag */}
          <div className="pf-stage__serial">
            <span>ZENOVA PASS</span>
            <b>#{String(user?.id || 2027).slice(-4).padStart(4, '0')}</b>
          </div>

          {/* 3D Mascot Showcase */}
          <div className="pf-stage__figure-wrap">
            <img
              src={heroMaskSrc}
              alt="ZENOVA Emblem"
              className="pf-stage__figure"
              draggable={false}
            />
            <div className="pf-stage__pedestal-shadow" aria-hidden="true" />
          </div>

          {/* Bottom-left frosted user pill */}
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
                <span className="pf-stage__user-verified">PRO</span>
              )}
            </div>
          </div>

          {/* Bottom-right level tag */}
          <div className="pf-stage__lvl-pill">
            LVL {cineLevel}
          </div>
        </div>

        {/* ═════ 2. MINIMALIST RANK BAR ═════ */}
        <div className="pf-rank-bar">
          <div className="pf-rank-bar__left">
            <span className="pf-rank-bar__diamond" aria-hidden="true">◆</span>
            <span>Ранг профиля</span>
          </div>
          <div className="pf-rank-bar__right">
            <strong>{rankTitle}</strong>
            <span>{totalXp} XP</span>
          </div>
        </div>

        {/* ═════ 3. 2-COLUMN INFO & STATUS CARD ═════ */}
        <div className="pf-meta-card">
          <div className="pf-meta-card__top">
            <div className="pf-meta-card__col">
              <span className="pf-meta-card__label">Участник</span>
              <strong className="pf-meta-card__value">{displayName}</strong>
            </div>
            <div className="pf-meta-card__divider" />
            <div className="pf-meta-card__col pf-meta-card__col--right">
              <span className="pf-meta-card__label">
                {effectivePremium ? 'Подписка' : 'Прогресс'}
              </span>
              <strong className="pf-meta-card__clock">
                {effectivePremium
                  ? (daysLeft ? `${String(daysLeft).padStart(2, '0')}Д : АКТИВЕН` : 'PRO · 4K HDR')
                  : `LVL ${cineLevel} · ${levelProgress}%`}
              </strong>
            </div>
          </div>

          <div className="pf-meta-card__desc">
            <div className="pf-meta-card__desc-head">
              <span>Статус аккаунта</span>
              <b>{levelProgress}% до LVL {cineLevel + 1}</b>
            </div>
            <div className="pf-meta-card__xp-track">
              <div className="pf-meta-card__xp-fill" style={{ width: `${levelProgress}%` }} />
            </div>
          </div>
        </div>

        {/* ═════ 4. MINIMALIST SLIDER CTA BAR ═════ */}
        <button
          type="button"
          className="pf-slider-cta"
          onClick={() => {
            haptic('light');
            navigate('/premium');
          }}
        >
          <span className="pf-slider-cta__pill">
            {effectivePremium ? 'Привилегии PRO' : 'Открыть PRO Доступ'}
          </span>
          <span className="pf-slider-cta__chevrons" aria-hidden="true">
            <i>›</i><i>›</i><i>›</i>
          </span>
        </button>
      </section>

      {/* ═════ 5. DISCOVER HEADER & PILL TABS ═════ */}
      <section className="pf-discover">
        <div className="pf-discover__head">
          <h2 className="pf-discover__title">Пространство</h2>
          <button
            type="button"
            className="pf-discover__icon-btn"
            onClick={() => {
              haptic('light');
              navigate('/favorites');
            }}
            aria-label="Открыть избранное"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H8M17 7V16" />
            </svg>
          </button>
        </div>

        <div className="pf-pill-tabs">
          {([
            { id: 'all', label: 'Обзор' },
            { id: 'diary', label: 'Дневник' },
            { id: 'seasons', label: 'Атмосфера' },
            { id: 'services', label: 'Разделы' },
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

        {/* ═════ 6. 2×2 SMOKED-GLASS BENTO GRID (Minimalist Dark-Luxury) ═════ */}
        {sectionFilter === 'all' && (
          <div className="pf-neon-grid">
            <button
              type="button"
              className="pf-neon-card pf-neon-card--watched"
              onClick={() => {
                haptic('light');
                navigate('/favorites');
              }}
            >
              <div className="pf-neon-card__top">
                <span className="pf-neon-card__stat">{watchHistory.length} фильмов</span>
                <span className="pf-neon-card__arrow">↗</span>
              </div>
              <div className="pf-neon-card__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div className="pf-neon-card__bottom">
                <strong>Просмотрено</strong>
                <span>История просмотров</span>
              </div>
            </button>

            <button
              type="button"
              className="pf-neon-card pf-neon-card--fav"
              onClick={() => {
                haptic('light');
                navigate('/favorites');
              }}
            >
              <div className="pf-neon-card__top">
                <span className="pf-neon-card__stat">{favorites.length} в списке</span>
                <span className="pf-neon-card__arrow">↗</span>
              </div>
              <div className="pf-neon-card__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="pf-neon-card__bottom">
                <strong>Избранное</strong>
                <span>Личная коллекция</span>
              </div>
            </button>

            <button
              type="button"
              className="pf-neon-card pf-neon-card--worlds"
              onClick={() => {
                haptic('light');
                openSideMenu();
              }}
            >
              <div className="pf-neon-card__top">
                <span className="pf-neon-card__stat">7 платформ</span>
                <span className="pf-neon-card__arrow">↗</span>
              </div>
              <div className="pf-neon-card__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="pf-neon-card__bottom">
                <strong>Вселенные</strong>
                <span>Netflix · Disney+ · HBO</span>
              </div>
            </button>

            <button
              type="button"
              className="pf-neon-card pf-neon-card--winter"
              onClick={() => {
                haptic('light');
                navigate('/new-year');
              }}
            >
              <div className="pf-neon-card__top">
                <span className="pf-neon-card__stat">Сезон</span>
                <span className="pf-neon-card__arrow">↗</span>
              </div>
              <div className="pf-neon-card__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07L19.07 4.93" />
                </svg>
              </div>
              <div className="pf-neon-card__bottom">
                <strong>Зимний марафон</strong>
                <span>Подборка и таймер</span>
              </div>
            </button>
          </div>
        )}
      </section>

      {/* ═════ 7. VERTICAL OVAL CAPSULES — SEASONAL ATMOSPHERE ═════ */}
      {(sectionFilter === 'all' || sectionFilter === 'seasons') && (
        <section className="pf-section">
          <div className="pf-section__head">
            <h3 className="pf-section__title">Атмосфера</h3>
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
                  style={{ '--cap-dot': s.dotColor } as React.CSSProperties}
                  onClick={() => switchSeason(s.id)}
                >
                  <span className="pf-capsule__orb">{s.emoji}</span>
                  <span className="pf-capsule__chevrons" aria-hidden="true">
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
                {fxOff ? 'Фоновые сезонные частицы выключены' : 'Фоновые сезонные частицы включены'}
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
                  {garlandOff ? 'Верхняя гирлянда скрыта' : 'Верхняя гирлянда включена'}
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
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

      <div className="pf__footer">ZENOVA · DIGITAL CINEMA</div>
    </div>
  );
};

export default ProfilePage;
