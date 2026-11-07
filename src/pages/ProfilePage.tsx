import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import VeloraEmblem from '../components/VeloraEmblem';
import RulesModal from '../components/RulesModal';
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
  sub: string;
  emoji: string;
  bg: string;
  border: string;
}> = [
  {
    id: 'winter',
    name: 'Супер Новогодняя',
    sub: 'Морозный кристалл, Санта и гирлянда',
    emoji: '🎄',
    bg: 'linear-gradient(135deg, rgba(14, 165, 233, 0.36) 0%, rgba(244, 63, 94, 0.28) 55%, rgba(250, 204, 21, 0.24) 100%)',
    border: 'rgba(125, 211, 252, 0.6)',
  },
  {
    id: 'spring',
    name: 'Неоновая Сакура',
    sub: 'Цветущий Токио и лепестки сакуры',
    emoji: '🌸',
    bg: 'linear-gradient(135deg, rgba(244, 114, 182, 0.34) 0%, rgba(168, 85, 247, 0.26) 100%)',
    border: 'rgba(244, 114, 182, 0.58)',
  },
  {
    id: 'summer',
    name: 'Солнечная Лазурь',
    sub: 'Бирюзовый океан и золотые блики',
    emoji: '🌞',
    bg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.34) 0%, rgba(6, 182, 212, 0.3) 100%)',
    border: 'rgba(251, 191, 36, 0.58)',
  },
  {
    id: 'autumn',
    name: 'Тёплый Янтарь',
    sub: 'Бархатный листопад и уютный свет',
    emoji: '🍁',
    bg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.36) 0%, rgba(180, 83, 9, 0.28) 100%)',
    border: 'rgba(251, 146, 60, 0.58)',
  },
  {
    id: 'none',
    name: 'Обсидиан PRO',
    sub: 'Эталонный тёмный кинозал',
    emoji: '✦',
    bg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.28) 0%, rgba(24, 22, 36, 0.8) 100%)',
    border: 'rgba(251, 113, 133, 0.52)',
  },
  {
    id: 'auto',
    name: 'Авто-сезон',
    sub: `По календарю (${detectSeason().label})`,
    emoji: '⚡',
    bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(56, 189, 248, 0.26) 100%)',
    border: 'rgba(52, 211, 153, 0.55)',
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
  const username = user?.username ? `@${user.username}` : (telegramUsername ? `@${telegramUsername}` : '');
  const effectiveUser = user?.username || telegramUsername || '';
  const userAccess = resolveUserAccess(effectiveUser);
  const isAdminUser = userAccess.isAdmin || userAccess.isModerator || role === 'admin' || role === 'moderator' || user?.username === 'ZenovaAdmin';
  const effectivePremium = isPremium || userAccess.isVip;

  /* Кино-ранг и XP прогресс для PRO-профиля */
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

  /* Достижения пользователя */
  const achievements = [
    {
      id: 'cinephile',
      icon: '🎬',
      title: 'Киноэстет',
      desc: 'Первые фильмы',
      unlocked: watchHistory.length >= 1 || favorites.length >= 1,
    },
    {
      id: 'collector',
      icon: '💎',
      title: 'Коллекционер',
      desc: '3+ в избранном',
      unlocked: favorites.length >= 3,
    },
    {
      id: 'explorer',
      icon: '🌐',
      title: 'Покоритель Миров',
      desc: '7 кино-студий',
      unlocked: true,
    },
    {
      id: 'vip',
      icon: '👑',
      title: 'VIP Клуб',
      desc: 'PRO привилегии',
      unlocked: effectivePremium || isAdminUser,
    },
  ];

  /* Элементы интерактивного дневника в профиле */
  const diaryMovies = (() => {
    if (diaryTab === 'favorites') return favorites;
    return trackedList
      .filter((t) => t.status === diaryTab)
      .map((t) => t.movie);
  })();

  const groups: MenuGroup[] = [
    {
      title: 'ПОДПИСКА И ЭКОСИСТЕМА ZENOVA',
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
            </svg>
          ),
          label: 'Кино-Миры и Студии',
          sub: 'Netflix · Disney+ · HBO Max · Apple TV+ · Marvel · A24',
          action: () => navigate('/studios'),
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
      ],
    },
    {
      title: 'ПРАВОВАЯ ИНФОРМАЦИЯ',
      items: [
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
      <div className="pf__bg" />

      {/* ═════ 3D HOLOGRAPHIC TITANIUM VIP MEMBER CARD ═════ */}
      <div className="pf__card pf__card--pro">
        <div className="pf__card-aurora" aria-hidden="true" />
        <div className="pf__card-shine" />
        <div className="pf__card-mesh" aria-hidden="true" />

        {/* Верхняя плашка клубной карты */}
        <div className="pf__pass-top">
          <span className="pf__pass-kicker">✦ ZENOVA CINEMA CLUB • PASS</span>
          <span className="pf__pass-serial">
            ID #{String(user?.id || 2027).slice(-4).padStart(4, '0')} • 4K HDR
          </span>
        </div>

        <div className="pf__card-top">
          <div className="pf__avatar-wrap">
            <div className="pf__avatar-ring" />
            <div className="pf__avatar">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="" />
              ) : (
                <span>{displayName[0]?.toUpperCase() || 'Z'}</span>
              )}
            </div>
            <div className="pf__level-pill">LVL {cineLevel}</div>
          </div>

          <div className="pf__user-meta">
            <div className="pf__user-title-row">
              <h1 className="pf__name">{displayName}</h1>
              {(isAdminUser || effectivePremium) && (
                <span className="pf__verified" title="Верифицирован">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
              )}
            </div>
            {username && <p className="pf__username">{username}</p>}
            <div className="pf__badges">
              {effectivePremium ? (
                <span className="pf__badge pf__badge--premium">👑 ZENOVA VIP PRO</span>
              ) : (
                <span className="pf__badge pf__badge--rank">✦ {rankTitle}</span>
              )}
              {isAdminUser && <span className="pf__badge pf__badge--admin">FOUNDER</span>}
            </div>
          </div>

          <div className="pf__emblem-pod">
            <VeloraEmblem size="md" className="pf__card-emblem" />
          </div>
        </div>

        {/* Прогресс кино-ранга (PRO XP Bar) */}
        <div className="pf__xp-box">
          <div className="pf__xp-head">
            <span className="pf__xp-rank">🏆 Ранг: {rankTitle}</span>
            <span className="pf__xp-val">{totalXp} XP · {levelProgress}% до ур. {cineLevel + 1}</span>
          </div>
          <div className="pf__xp-bar">
            <div className="pf__xp-fill" style={{ width: `${levelProgress}%` }} />
          </div>
        </div>

        <div className="pf__vip-status-bar" onClick={() => navigate('/premium')}>
          <div className="pf__vip-status-left">
            <span className={`pf__vip-dot ${effectivePremium ? 'active' : ''}`} />
            <span className="pf__vip-status-text">
              {effectivePremium
                ? (isAdminUser ? 'Бессрочный PRO VIP доступ активен' : `PRO активен · ${daysLeft ? `осталось ${daysLeft} дн.` : 'Безлимит'}`)
                : 'Откройте 4K потоки, премиум-серверы и режим без рекламы'}
            </span>
          </div>
          <span className="pf__vip-action-btn">
            {effectivePremium ? 'Привилегии' : 'PRO Доступ'} →
          </span>
        </div>
      </div>

      {/* ═════ 4-Плиточный PRO Bento Дашборд ═════ */}
      <div className="pf__bento-stats">
        <button type="button" className="pf__bento-tile" onClick={() => navigate('/favorites')}>
          <span className="pf__bento-icon">🎬</span>
          <span className="pf__bento-val">{watchHistory.length}</span>
          <span className="pf__bento-lbl">Просмотрено</span>
        </button>
        <button type="button" className="pf__bento-tile" onClick={() => navigate('/favorites')}>
          <span className="pf__bento-icon">❤️</span>
          <span className="pf__bento-val">{favorites.length}</span>
          <span className="pf__bento-lbl">Избранное</span>
        </button>
        <button type="button" className="pf__bento-tile" onClick={() => navigate('/studios')}>
          <span className="pf__bento-icon">🌐</span>
          <span className="pf__bento-val">7</span>
          <span className="pf__bento-lbl">Кино-Миров</span>
        </button>
        <button type="button" className="pf__bento-tile pf__bento-tile--pro" onClick={() => navigate('/premium')}>
          <span className="pf__bento-icon">👑</span>
          <span className="pf__bento-val">{effectivePremium ? 'VIP' : 'PRO'}</span>
          <span className="pf__bento-lbl">Статус</span>
        </button>
      </div>

      {/* ═════ Медали и Достижения Киномана ═════ */}
      <div className="pf__section-wrap">
        <div className="pf__group-title">🏅 ДОСТИЖЕНИЯ КИНОМАНА</div>
        <div className="pf__achievements-grid">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`pf__ach-card ${ach.unlocked ? 'unlocked' : 'locked'}`}
            >
              <span className="pf__ach-icon">{ach.icon}</span>
              <div className="pf__ach-copy">
                <span className="pf__ach-title">{ach.title}</span>
                <span className="pf__ach-desc">{ach.desc}</span>
              </div>
              <span className="pf__ach-state">{ach.unlocked ? '✓' : '🔒'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═════ Интерактивный Кино-Дневник прямо в профиле ═════ */}
      <div className="pf__section-wrap">
        <div className="pf__diary-head">
          <span className="pf__group-title" style={{ margin: 0 }}>📚 МОЯ КОЛЛЕКЦИЯ И ДНЕВНИК</span>
          <button
            type="button"
            className="pf__diary-all-btn"
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
      </div>

      {/* ═════ Секции настроек и сервисов ═════ */}
      <div className="pf__groups">
        {/* ── СЕЗОННАЯ СТУДИЯ ОФОРМЛЕНИЯ (ВИЗУАЛЬНЫЕ КАРТОЧКИ С ГРАДИЕНТАМИ) ── */}
        <div className="pf__group">
          <div className="pf__group-title">🎨 СЕЗОННАЯ СТУДИЯ И АТМОСФЕРА</div>
          <div className="pf__group-box pf__season-box">
            <div className="pf__season-grid">
              {VISUAL_SEASONS.map((s) => {
                const isSelected = activeChoice === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`pf__season-card ${isSelected ? 'active' : ''}`}
                    style={
                      {
                        '--sc-bg': s.bg,
                        '--sc-border': s.border,
                      } as React.CSSProperties
                    }
                    onClick={() => switchSeason(s.id)}
                  >
                    <div className="pf__season-card__top">
                      <span className="pf__season-card__emoji">{s.emoji}</span>
                      {isSelected && <span className="pf__season-card__active-pill">✓ Активна</span>}
                    </div>
                    <span className="pf__season-card__name">{s.name}</span>
                    <span className="pf__season-card__sub">{s.sub}</span>
                  </button>
                );
              })}
            </div>

            <div className="pf__season-switches">
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

            <button
              type="button"
              className="pf__ny-special-btn"
              onClick={() => {
                haptic('medium');
                navigate('/new-year');
              }}
            >
              <div className="pf__ny-special-btn__left">
                <img src="/zenova-mask-winter.png" alt="" className="pf__ny-special-btn__img" />
                <div>
                  <span className="pf__ny-special-btn__title">🎄 Новогодний марафон 2027</span>
                  <span className="pf__ny-special-btn__sub">Праздничная рулетка фильмов и таймер</span>
                </div>
              </div>
              <span className="pf__ny-special-btn__arrow">Открыть →</span>
            </button>
          </div>
        </div>

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

      {/* Недавно смотрели */}
      {watchHistory.length > 0 && (
        <div className="pf__group" style={{ marginInline: 14 }}>
          <div className="pf__history-header">
            <span className="pf__group-title">НЕДАВНО СМОТРЕЛИ</span>
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

      <div className="pf__footer">ZENOVA PRO · Все права защищены</div>
    </div>
  );
};

export default ProfilePage;
