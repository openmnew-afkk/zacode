import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import RulesModal from '../components/RulesModal';
import { resolveUserAccess } from '../services/accessControl';
import { getStoredSeason, setStoredSeason, applySeason, detectSeason } from '../services/seasons';
import type { SeasonId } from '../services/seasons';
import './ProfilePage.css';

type SubPage = 'diary' | 'rank' | 'pro' | 'atmosphere' | 'history' | null;

const SEASONS: Array<{
  id: SeasonId | 'auto';
  name: string;
  sub: string;
  emoji: string;
  dotColor: string;
}> = [
  { id: 'winter', name: 'Зимний Кристалл', sub: 'Северное сияние и снег', emoji: '❄️', dotColor: '#7dd3fc' },
  { id: 'spring', name: 'Сакура', sub: 'Лепестки сакуры', emoji: '🌸', dotColor: '#f472b6' },
  { id: 'summer', name: 'Лазурь', sub: 'Летние блики', emoji: '☀️', dotColor: '#fbbf24' },
  { id: 'autumn', name: 'Янтарь', sub: 'Бархатный листопад', emoji: '🍁', dotColor: '#fb923c' },
  { id: 'none', name: 'Обсидиан', sub: 'Чистый темный кинозал', emoji: '🖤', dotColor: '#fb7185' },
  { id: 'auto', name: 'Авто-сезон', sub: `По календарю (${detectSeason().label})`, emoji: '✨', dotColor: '#a78bfa' },
];

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, closeApp, haptic } = useTelegram();
  const {
    favorites,
    watchHistory,
    tracked,
    clearHistory,
    isPremium,
    premiumExpiry,
    role,
    theme,
    toggleTheme,
    telegramUsername,
  } = useStore();

  const [subPage, setSubPage] = useState<SubPage>(null);
  const [diaryFilter, setDiaryFilter] = useState<'all' | 'watched' | 'want' | 'watching'>('all');
  const [showRules, setShowRules] = useState(false);
  const [seasonState, setSeasonState] = useState(() => getStoredSeason());

  // Тумблер северного сияния
  const [auroraOff, setAuroraOff] = useState(() => {
    try {
      return localStorage.getItem('zenova_aurora_off') === '1';
    } catch {
      return false;
    }
  });

  const toggleAurora = () => {
    haptic('light');
    const next = !auroraOff;
    setAuroraOff(next);
    try {
      localStorage.setItem('zenova_aurora_off', next ? '1' : '0');
    } catch {}
    window.dispatchEvent(new CustomEvent('zenova-aurora-toggle'));
    window.dispatchEvent(new CustomEvent('zenova-fx-change'));
  };

  // Тумблер сезонных частиц (снегопад, листья)
  const [fxOff, setFxOff] = useState(() => {
    try {
      return localStorage.getItem('zenova_fx_off') === '1';
    } catch {
      return false;
    }
  });

  const toggleFx = () => {
    haptic('light');
    const next = !fxOff;
    setFxOff(next);
    try {
      localStorage.setItem('zenova_fx_off', next ? '1' : '0');
    } catch {}
    window.dispatchEvent(new CustomEvent('zenova-fx-change'));
  };

  const displayName = user
    ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`
    : 'Киноман ZENOVA';
  const username = user?.username
    ? `@${user.username}`
    : telegramUsername
    ? `@${telegramUsername}`
    : '@zenova_guest';

  const effectiveUser = user?.username || telegramUsername || '';
  const userAccess = resolveUserAccess(effectiveUser);
  const isAdminUser =
    userAccess.isAdmin || userAccess.isModerator || role === 'admin' || role === 'moderator' || user?.username === 'ZenovaAdmin';
  const effectivePremium = isPremium || userAccess.isVip;

  // Кино-ранг & XP
  const trackedList = Object.values(tracked || {});
  const trackedCount = trackedList.length;
  const totalXp =
    watchHistory.length * 45 + favorites.length * 30 + trackedCount * 25 + (effectivePremium ? 250 : 60);
  const cineLevel = Math.min(30, Math.max(1, Math.floor(totalXp / 140) + 1));
  const levelProgress = Math.min(100, Math.round(((totalXp % 140) / 140) * 100));

  const rankTitle =
    cineLevel >= 21
      ? 'Легенда Кино'
      : cineLevel >= 13
      ? 'Кинокритик'
      : cineLevel >= 6
      ? 'Синефил'
      : 'Кинолюбитель';

  const switchSeason = (id: SeasonId | 'auto') => {
    haptic('light');
    setStoredSeason(id);
    const next = getStoredSeason();
    applySeason(next.season);
    setSeasonState(next);
  };

  // Список фильмов кино-дневника
  const filteredDiary = trackedList.filter((item) => {
    if (diaryFilter === 'all') return true;
    return item.status === diaryFilter;
  });

  /* ══════════════ ПОДСТРАНИЦА: КИНО-ДНЕВНИК ══════════════ */
  if (subPage === 'diary') {
    return (
      <div className="ios-subpage">
        <header className="ios-subpage__nav">
          <button
            type="button"
            className="ios-subpage__back"
            onClick={() => {
              haptic('light');
              setSubPage(null);
            }}
          >
            ‹ Назад
          </button>
          <h1 className="ios-subpage__title">Кино-Дневник</h1>
          <div className="ios-subpage__action-space" />
        </header>

        <div className="ios-subpage__body">
          {/* Фильтры статуса */}
          <div className="ios-segmented">
            {[
              { id: 'all', label: `Все (${trackedList.length})` },
              { id: 'watched', label: 'Просмотрено' },
              { id: 'want', label: 'В планах' },
              { id: 'watching', label: 'Смотрю' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`ios-segmented__item ${diaryFilter === f.id ? 'active' : ''}`}
                onClick={() => {
                  haptic('light');
                  setDiaryFilter(f.id as any);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredDiary.length === 0 ? (
            <div className="ios-empty-state">
              <span className="ios-empty-state__icon">📖</span>
              <h3 className="ios-empty-state__title">Дневник пока пуст</h3>
              <p className="ios-empty-state__text">
                Отмечайте фильмы на странице кино («Смотрю», «Буду смотреть» или «Просмотрено»), и они появятся в вашем личном дневнике.
              </p>
              <button
                type="button"
                className="ios-empty-state__btn"
                onClick={() => navigate('/')}
              >
                Выбрать фильм
              </button>
            </div>
          ) : (
            <div className="ios-diary-grid">
              {filteredDiary.map((item) => (
                <div
                  key={item.movie.id}
                  className="ios-diary-card"
                  onClick={() => {
                    haptic('light');
                    navigate(`/movie/${item.movie.id}`);
                  }}
                >
                  <img
                    src={item.movie.poster_path || ''}
                    alt={item.movie.title}
                    className="ios-diary-card__poster"
                    loading="lazy"
                  />
                  <div className="ios-diary-card__content">
                    <div className="ios-diary-card__head">
                      <span className={`ios-diary-badge ${item.status}`}>
                        {item.status === 'watched'
                          ? 'Просмотрено'
                          : item.status === 'want'
                          ? 'В планах'
                          : 'Смотрю'}
                      </span>
                      {item.rating && (
                        <span className="ios-diary-rating">★ {item.rating}</span>
                      )}
                    </div>
                    <div className="ios-diary-card__title">{item.movie.title}</div>
                    <div className="ios-diary-card__meta">
                      {item.movie.release_date?.slice(0, 4) || '—'} ·{' '}
                      {item.movie.genres?.[0] || 'Кино'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══════════════ ПОДСТРАНИЦА: РАНГ И ПРИВИЛЕГИИ ══════════════ */
  if (subPage === 'rank') {
    return (
      <div className="ios-subpage">
        <header className="ios-subpage__nav">
          <button
            type="button"
            className="ios-subpage__back"
            onClick={() => {
              haptic('light');
              setSubPage(null);
            }}
          >
            ‹ Назад
          </button>
          <h1 className="ios-subpage__title">Рейтинг & Награды</h1>
          <div className="ios-subpage__action-space" />
        </header>

        <div className="ios-subpage__body">
          {/* Карточка текущего ранга */}
          <div className="ios-rank-hero">
            <div className="ios-rank-hero__badge">УРОВЕНЬ {cineLevel}</div>
            <h2 className="ios-rank-hero__title">{rankTitle}</h2>
            <div className="ios-rank-hero__bar">
              <div
                className="ios-rank-hero__fill"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            <div className="ios-rank-hero__xp">
              <span>{totalXp % 140} XP</span>
              <span>140 XP до следующего ранга</span>
            </div>
          </div>

          <div className="ios-section-header">КАК ПОЛУЧАТЬ ОПЫТ (XP)</div>
          <div className="ios-group">
            <div className="ios-row">
              <span className="ios-row__icon-box bg-rose">🍿</span>
              <div className="ios-row__info">
                <div className="ios-row__title">Просмотр фильма</div>
                <div className="ios-row__sub">За каждый просмотр в плеере</div>
              </div>
              <span className="ios-row__val text-accent">+45 XP</span>
            </div>
            <div className="ios-row">
              <span className="ios-row__icon-box bg-amber">⭐</span>
              <div className="ios-row__info">
                <div className="ios-row__title">Добавление в Избранное</div>
                <div className="ios-row__sub">За сохранение фильма в коллекцию</div>
              </div>
              <span className="ios-row__val text-accent">+30 XP</span>
            </div>
            <div className="ios-row">
              <span className="ios-row__icon-box bg-emerald">📖</span>
              <div className="ios-row__info">
                <div className="ios-row__title">Запись в Кино-Дневник</div>
                <div className="ios-row__sub">За оценку и статус релиза</div>
              </div>
              <span className="ios-row__val text-accent">+25 XP</span>
            </div>
            <div className="ios-row">
              <span className="ios-row__icon-box bg-purple">👑</span>
              <div className="ios-row__info">
                <div className="ios-row__title">Статус ZENOVA PRO</div>
                <div className="ios-row__sub">Ежемесячный бонус подписчика</div>
              </div>
              <span className="ios-row__val text-accent">+250 XP</span>
            </div>
          </div>

          <div className="ios-section-header">РЕЙТИНГОВЫЕ ПРИВИЛЕГИИ</div>
          <div className="ios-tiers">
            <div className={`ios-tier ${cineLevel >= 1 ? 'unlocked' : ''}`}>
              <div className="ios-tier__head">
                <span className="ios-tier__lvl">1–5 LVL</span>
                <span className="ios-tier__name">Кинолюбитель</span>
              </div>
              <p className="ios-tier__desc">Базовый HD доступ, сохранение в облако Telegram и синхронизация.</p>
            </div>

            <div className={`ios-tier ${cineLevel >= 6 ? 'unlocked' : ''}`}>
              <div className="ios-tier__head">
                <span className="ios-tier__lvl">6–12 LVL</span>
                <span className="ios-tier__name">Синефил</span>
              </div>
              <p className="ios-tier__desc">Кастомный неоновый градиент никнейма, эксклюзивные кино-темы профиля.</p>
            </div>

            <div className={`ios-tier ${cineLevel >= 13 ? 'unlocked' : ''}`}>
              <div className="ios-tier__head">
                <span className="ios-tier__lvl">13–20 LVL</span>
                <span className="ios-tier__name">Кинокритик</span>
              </div>
              <p className="ios-tier__desc">Золотой значок Критика в дневнике, автовыбор высшего битрейта (4K Ultra HD).</p>
            </div>

            <div className={`ios-tier ${cineLevel >= 21 ? 'unlocked' : ''}`}>
              <div className="ios-tier__head">
                <span className="ios-tier__lvl">21–30 LVL</span>
                <span className="ios-tier__name">Легенда Кино</span>
              </div>
              <p className="ios-tier__desc">Перламутровая рамка аватара, бессрочный статус VIP амбассадора ZENOVA.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════ ПОДСТРАНИЦА: ПРИВИЛЕГИИ PRO ══════════════ */
  if (subPage === 'pro') {
    return (
      <div className="ios-subpage">
        <header className="ios-subpage__nav">
          <button
            type="button"
            className="ios-subpage__back"
            onClick={() => {
              haptic('light');
              setSubPage(null);
            }}
          >
            ‹ Назад
          </button>
          <h1 className="ios-subpage__title">ZENOVA PRO</h1>
          <div className="ios-subpage__action-space" />
        </header>

        <div className="ios-subpage__body">
          <div className="ios-pro-card">
            <span className="ios-pro-card__icon">👑</span>
            <div className="ios-pro-card__status">
              {effectivePremium ? 'ПОДПИСКА PRO АКТИВНА' : 'БАЗОВЫЙ ДОСТУП'}
            </div>
            <h2 className="ios-pro-card__title">Премиум возможности</h2>
            <p className="ios-pro-card__desc">
              Максимальное качество видео, пространственный звук и полный комфорт без ограничений.
            </p>

            <div className="ios-pro-features">
              <div className="ios-pro-feat">
                <span className="ios-pro-feat__check">✓</span>
                <span>4K Ultra HD & Dolby Atmos</span>
              </div>
              <div className="ios-pro-feat">
                <span className="ios-pro-feat__check">✓</span>
                <span>Полное отсутствие рекламы</span>
              </div>
              <div className="ios-pro-feat">
                <span className="ios-pro-feat__check">✓</span>
                <span>Стриминг полных треков в музыке</span>
              </div>
              <div className="ios-pro-feat">
                <span className="ios-pro-feat__check">✓</span>
                <span>Эксклюзивные темы и атмосфера</span>
              </div>
            </div>

            <button
              type="button"
              className="ios-btn-primary"
              onClick={() => {
                haptic('medium');
                navigate('/premium');
              }}
            >
              {effectivePremium ? 'Управление подпиской ›' : 'Подключить ZENOVA PRO ›'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════ ПОДСТРАНИЦА: АТМОСФЕРА И СЕВЕРНОЕ СИЯНИЕ ══════════════ */
  if (subPage === 'atmosphere') {
    return (
      <div className="ios-subpage">
        <header className="ios-subpage__nav">
          <button
            type="button"
            className="ios-subpage__back"
            onClick={() => {
              haptic('light');
              setSubPage(null);
            }}
          >
            ‹ Назад
          </button>
          <h1 className="ios-subpage__title">Атмосфера</h1>
          <div className="ios-subpage__action-space" />
        </header>

        <div className="ios-subpage__body">
          <div className="ios-section-header">ВИЗУАЛЬНЫЕ ЭФФЕКТЫ</div>
          <div className="ios-group">
            <div className="ios-row">
              <span className="ios-row__icon-box bg-emerald">🌌</span>
              <div className="ios-row__info">
                <div className="ios-row__title">Северное Сияние</div>
                <div className="ios-row__sub">Мягкие переливы авроры вверху экрана</div>
              </div>
              <button
                type="button"
                className={`ios-toggle ${auroraOff ? '' : 'on'}`}
                onClick={toggleAurora}
              >
                <span className="ios-toggle__thumb" />
              </button>
            </div>

            <div className="ios-row">
              <span className="ios-row__icon-box bg-cyan">❄️</span>
              <div className="ios-row__info">
                <div className="ios-row__title">Сезонные частицы</div>
                <div className="ios-row__sub">Снегопад, лепестки сакуры, листья</div>
              </div>
              <button
                type="button"
                className={`ios-toggle ${fxOff ? '' : 'on'}`}
                onClick={toggleFx}
              >
                <span className="ios-toggle__thumb" />
              </button>
            </div>
          </div>

          <div className="ios-section-header">СЕЗОННЫЕ ТЕМЫ</div>
          <div className="ios-group">
            {SEASONS.map((s) => (
              <div
                key={s.id}
                className="ios-row clickable"
                onClick={() => switchSeason(s.id)}
              >
                <span className="ios-row__icon-box" style={{ background: `${s.dotColor}22`, color: s.dotColor }}>
                  {s.emoji}
                </span>
                <div className="ios-row__info">
                  <div className="ios-row__title">{s.name}</div>
                  <div className="ios-row__sub">{s.sub}</div>
                </div>
                {(seasonState.auto && s.id === 'auto') || (!seasonState.auto && seasonState.season.id === s.id) ? (
                  <span className="ios-check">✓</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════ ПОДСТРАНИЦА: ИСТОРИЯ ══════════════ */
  if (subPage === 'history') {
    return (
      <div className="ios-subpage">
        <header className="ios-subpage__nav">
          <button
            type="button"
            className="ios-subpage__back"
            onClick={() => {
              haptic('light');
              setSubPage(null);
            }}
          >
            ‹ Назад
          </button>
          <h1 className="ios-subpage__title">История просмотров</h1>
          {watchHistory.length > 0 && (
            <button
              type="button"
              className="ios-subpage__action"
              onClick={() => {
                haptic('heavy');
                clearHistory();
              }}
            >
              Очистить
            </button>
          )}
        </header>

        <div className="ios-subpage__body">
          {watchHistory.length === 0 ? (
            <div className="ios-empty-state">
              <span className="ios-empty-state__icon">🍿</span>
              <h3 className="ios-empty-state__title">История пуста</h3>
              <p className="ios-empty-state__text">Здесь будут отображаться фильмы, которые вы начали смотреть.</p>
            </div>
          ) : (
            <div className="ios-group">
              {watchHistory.map((item) => {
                const m = item.movie;
                return (
                  <div
                    key={m.id}
                    className="ios-row clickable"
                    onClick={() => {
                      haptic('light');
                      navigate(`/movie/${m.id}`);
                    }}
                  >
                    <img
                      src={m.poster_path}
                      alt=""
                      style={{ width: 36, height: 50, borderRadius: 6, objectFit: 'cover' }}
                    />
                    <div className="ios-row__info">
                      <div className="ios-row__title">{m.title}</div>
                      <div className="ios-row__sub">{m.release_date?.slice(0, 4) || 'Кино'}</div>
                    </div>
                    <span className="ios-chevron">›</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══════════════ ГЛАВНЫЙ ЭКРАН ПРОФИЛЯ (iOS Settings Layout) ══════════════ */
  return (
    <div className="ios-profile-page page">
      {/* Шапка профиля */}
      <header className="ios-header">
        <h1 className="ios-header__title">Профиль</h1>
        {isAdminUser && (
          <button
            type="button"
            className="ios-admin-btn"
            onClick={() => navigate('/admin')}
          >
            Админка
          </button>
        )}
      </header>

      {/* Карточка пользователя с рангом */}
      <div className="ios-user-card" onClick={() => setSubPage('rank')}>
        <div className="ios-user-card__top">
          <div className="ios-user-avatar">
            <span>{displayName.slice(0, 1)}</span>
            <span className="ios-user-lvl-pill">{cineLevel}</span>
          </div>
          <div className="ios-user-info">
            <h2 className="ios-user-name">{displayName}</h2>
            <div className="ios-user-meta">
              <span>{username}</span>
              {effectivePremium && <span className="ios-vip-chip">PRO</span>}
            </div>
          </div>
          <span className="ios-chevron">›</span>
        </div>

        {/* Шкала ранга */}
        <div className="ios-user-rank-bar">
          <div className="ios-user-rank-track">
            <div
              className="ios-user-rank-fill"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="ios-user-rank-labels">
            <span className="ios-user-rank-title">{rankTitle}</span>
            <span className="ios-user-rank-pts">{totalXp % 140} / 140 XP</span>
          </div>
        </div>
      </div>

      {/* ── ГРУППА 1: МОЁ КИНО ── */}
      <div className="ios-section-header">МОЁ КИНО</div>
      <div className="ios-group">
        <div
          className="ios-row clickable"
          onClick={() => {
            haptic('light');
            setSubPage('diary');
          }}
        >
          <span className="ios-row__icon-box bg-purple">📖</span>
          <div className="ios-row__info">
            <div className="ios-row__title">Кино-Дневник & Оценки</div>
            <div className="ios-row__sub">Смотрю, в планах, просмотрено</div>
          </div>
          <span className="ios-row__val">{trackedCount > 0 ? `${trackedCount} записей` : 'Пусто'}</span>
          <span className="ios-chevron">›</span>
        </div>

        <div
          className="ios-row clickable"
          onClick={() => {
            haptic('light');
            setSubPage('history');
          }}
        >
          <span className="ios-row__icon-box bg-amber">🍿</span>
          <div className="ios-row__info">
            <div className="ios-row__title">История просмотров</div>
            <div className="ios-row__sub">Недавно открытые фильмы</div>
          </div>
          <span className="ios-row__val">{watchHistory.length > 0 ? `${watchHistory.length}` : '—'}</span>
          <span className="ios-chevron">›</span>
        </div>

        <div
          className="ios-row clickable"
          onClick={() => {
            haptic('light');
            navigate('/favorites');
          }}
        >
          <span className="ios-row__icon-box bg-rose">⭐</span>
          <div className="ios-row__info">
            <div className="ios-row__title">Избранное & Закладки</div>
            <div className="ios-row__sub">Сохранённые фильмы</div>
          </div>
          <span className="ios-row__val">{favorites.length > 0 ? `${favorites.length}` : '—'}</span>
          <span className="ios-chevron">›</span>
        </div>
      </div>

      {/* ── ГРУППА 2: ПОДПИСКА & РАНГ ── */}
      <div className="ios-section-header">ПРИВИЛЕГИИ</div>
      <div className="ios-group">
        <div
          className="ios-row clickable"
          onClick={() => {
            haptic('light');
            setSubPage('pro');
          }}
        >
          <span className="ios-row__icon-box bg-gold">👑</span>
          <div className="ios-row__info">
            <div className="ios-row__title">ZENOVA PRO</div>
            <div className="ios-row__sub">4K HDR, Dolby Atmos, без рекламы</div>
          </div>
          <span className={`ios-row__val ${effectivePremium ? 'text-green' : 'text-accent'}`}>
            {effectivePremium ? 'Активен' : 'Подключить'}
          </span>
          <span className="ios-chevron">›</span>
        </div>

        <div
          className="ios-row clickable"
          onClick={() => {
            haptic('light');
            setSubPage('rank');
          }}
        >
          <span className="ios-row__icon-box bg-blue">🏆</span>
          <div className="ios-row__info">
            <div className="ios-row__title">Рейтинговые Награды</div>
            <div className="ios-row__sub">Как получать опыт и ранги</div>
          </div>
          <span className="ios-row__val">{rankTitle}</span>
          <span className="ios-chevron">›</span>
        </div>
      </div>

      {/* ── ГРУППА 3: ВИЗУАЛ & АТМОСФЕРА ── */}
      <div className="ios-section-header">ПЕРСОНАЛИЗАЦИЯ</div>
      <div className="ios-group">
        <div
          className="ios-row clickable"
          onClick={() => {
            haptic('light');
            setSubPage('atmosphere');
          }}
        >
          <span className="ios-row__icon-box bg-emerald">🌌</span>
          <div className="ios-row__info">
            <div className="ios-row__title">Северное Сияние & Сезоны</div>
            <div className="ios-row__sub">Атмосферные эффекты приложения</div>
          </div>
          <span className="ios-row__val">{auroraOff ? 'Скрыто' : 'Активно'}</span>
          <span className="ios-chevron">›</span>
        </div>

        <div
          className="ios-row clickable"
          onClick={() => {
            haptic('light');
            toggleTheme();
          }}
        >
          <span className="ios-row__icon-box bg-indigo">🎨</span>
          <div className="ios-row__info">
            <div className="ios-row__title">Тема оформления</div>
            <div className="ios-row__sub">Светлый / Тёмный режим</div>
          </div>
          <span className="ios-row__val">{theme === 'dark' ? 'Тёмная' : 'Светлая'}</span>
          <span className="ios-chevron">›</span>
        </div>
      </div>

      {/* ── ГРУППА 4: ИНФОРМАЦИЯ & ВЫХОД ── */}
      <div className="ios-section-header">ПРИЛОЖЕНИЕ</div>
      <div className="ios-group">
        <div
          className="ios-row clickable"
          onClick={() => {
            haptic('light');
            setShowRules(true);
          }}
        >
          <span className="ios-row__icon-box bg-slate">📜</span>
          <div className="ios-row__info">
            <div className="ios-row__title">Правила и соглашение</div>
            <div className="ios-row__sub">Пользовательские условия</div>
          </div>
          <span className="ios-chevron">›</span>
        </div>

        <div
          className="ios-row clickable"
          onClick={() => {
            haptic('medium');
            closeApp();
          }}
        >
          <span className="ios-row__icon-box bg-red">✕</span>
          <div className="ios-row__info">
            <div className="ios-row__title text-danger">Закрыть ZENOVA</div>
          </div>
          <span className="ios-chevron">›</span>
        </div>
      </div>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
};

export default ProfilePage;
