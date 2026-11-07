import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import VeloraEmblem from '../components/VeloraEmblem';
import RulesModal from '../components/RulesModal';
import { resolveUserAccess } from '../services/accessControl';
import { SEASONS, getStoredSeason, setStoredSeason, applySeason, detectSeason } from '../services/seasons';
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

  /* Сезонное оформление */
  const [seasonState, setSeasonState] = useState(() => getStoredSeason());
  const seasonAuto = seasonState.auto;
  const currentSeasonId = seasonState.season.id;

  const switchSeason = (id: SeasonId) => {
    haptic('light');
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
  const trackedCount = Object.keys(tracked || {}).length;
  const totalXp = watchHistory.length * 45 + favorites.length * 30 + trackedCount * 25 + (effectivePremium ? 250 : 50);
  const cineLevel = Math.min(25, Math.max(1, Math.floor(totalXp / 150) + 1));
  const levelProgress = Math.min(100, Math.round(((totalXp % 150) / 150) * 100));
  const rankTitle =
    cineLevel >= 10
      ? 'Легенда Кинозала'
      : cineLevel >= 6
      ? 'Магистр Кино'
      : cineLevel >= 3
      ? 'Киноэстет PRO'
      : 'Первооткрыватель';

  const groups: MenuGroup[] = [
    {
      title: 'МЕДИАТЕКА И КИНО-МИРЫ',
      items: [
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
          highlight: true,
        },
        {
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          ),
          label: 'Избранное и списки',
          sub: `${favorites.length} в избранном · ${trackedCount} в дневнике`,
          action: () => navigate('/favorites'),
        },
        {
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7V12L15 15" strokeLinecap="round" />
            </svg>
          ),
          label: 'История просмотров',
          sub: `${watchHistory.length} просмотрено`,
          action: () => navigate('/favorites'),
        },
      ],
    },
    {
      title: 'ПОДПИСКА И ЭКОСИСТЕМА',
      items: [
        {
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1">
              <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" />
              <rect x="4" y="18" width="16" height="2" rx="1" />
            </svg>
          ),
          label: effectivePremium ? 'ZENOVA VIP PRO Активен' : 'Оформить ZENOVA PRO',
          sub: effectivePremium ? '4K потоки · Без рекламы · Приоритетный CDN' : 'Без рекламы · 4K HDR · 3 дня бесплатно',
          action: () => navigate('/premium'),
          highlight: !effectivePremium,
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
          sub: 'Мировые хиты · Саундтреки · ZENOVA Пульс',
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

      {/* ═════ PRO TITANIUM VIP PASSPORT CARD ═════ */}
      <div className="pf__card pf__card--pro">
        <div className="pf__card-shine" />
        <div className="pf__card-mesh" aria-hidden="true" />

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
                <span className="pf__badge pf__badge--premium">👑 ZENOVA PRO PASS</span>
              ) : (
                <span className="pf__badge pf__badge--rank">✦ {rankTitle}</span>
              )}
              {isAdminUser && <span className="pf__badge pf__badge--admin">FOUNDER / ADMIN</span>}
            </div>
          </div>

          <VeloraEmblem size="md" className="pf__card-emblem" />
        </div>

        {/* Прогресс кино-ранга (PRO XP Bar) */}
        <div className="pf__xp-box">
          <div className="pf__xp-head">
            <span className="pf__xp-rank">🏆 Ранг: {rankTitle}</span>
            <span className="pf__xp-val">{totalXp} XP · До ур. {cineLevel + 1}</span>
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
                : 'Откройте 4K потоки, все озвучки и режим без рекламы'}
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
          <span className="pf__bento-val">{effectivePremium ? 'PRO' : 'START'}</span>
          <span className="pf__bento-lbl">Статус</span>
        </button>
      </div>

      {/* ═════ Секции настроек и сервисов ═════ */}
      <div className="pf__groups">
        {/* ── СЕЗОННАЯ СТУДИЯ ОФОРМЛЕНИЯ (СУПЕР НОВОГОДНЯЯ ТЕМА И ДР.) ── */}
        <div className="pf__group">
          <div className="pf__group-title">🎄 СЕЗОННАЯ СТУДИЯ И АТМОСФЕРА</div>
          <div className="pf__group-box pf__season-box">
            <div className="pf__season-grid">
              <button
                type="button"
                className={`pf__season-card ${seasonAuto ? 'active' : ''}`}
                onClick={() => switchSeason('none')}
              >
                <span className="pf__season-card__emoji">✨</span>
                <span className="pf__season-card__name">Авто-сезон</span>
                <span className="pf__season-card__sub">По календарю ({detectSeason().label})</span>
              </button>

              {Object.values(SEASONS).map((s) => {
                const isSelected = !seasonAuto && currentSeasonId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`pf__season-card pf__season-card--${s.id} ${isSelected ? 'active' : ''}`}
                    style={{ '--sc-accent': s.vars['--accent'] || '#38bdf8' } as React.CSSProperties}
                    onClick={() => switchSeason(s.id)}
                  >
                    <span className="pf__season-card__emoji">{s.icon}</span>
                    <span className="pf__season-card__name">
                      {s.id === 'winter' ? 'Супер Новогодняя' : s.label}
                    </span>
                    <span className="pf__season-card__sub">{s.description}</span>
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
                  {fxOff ? '❄️ 3D-снегопад и частицы выключены' : '❄️ 3D-снегопад, кристаллы и боке включены'}
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

            {seasonState.season.id === 'winter' && (
              <button
                type="button"
                className="pf__ny-special-btn"
                onClick={() => {
                  haptic('medium');
                  navigate('/new-year');
                }}
              >
                <span>🎄 Открыть Новогодний спецраздел и таймер 2027</span>
                <span>→</span>
              </button>
            )}
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
        <div className="pf__group">
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
