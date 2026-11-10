import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Trophy,
  Crown,
  History as HistoryIcon,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Check,
  LogOut,
  Star,
  Flame,
  Tv,
} from 'lucide-react';
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
  dotColor: string;
}> = [
  { id: 'winter', name: 'Зимний Кристалл', sub: 'Северное сияние и снег', dotColor: '#7dd3fc' },
  { id: 'spring', name: 'Цветение Сакуры', sub: 'Весенние лепестки', dotColor: '#f472b6' },
  { id: 'summer', name: 'Лазурный Бриз', sub: 'Теплые блики и светлячки', dotColor: '#fbbf24' },
  { id: 'autumn', name: 'Янтарный Закат', sub: 'Бархатный листопад', dotColor: '#fb923c' },
  { id: 'none', name: 'Глубокий Обсидиан', sub: 'Чистый кинематографичный кинозал', dotColor: '#94a3b8' },
  { id: 'auto', name: 'Авто-сезон', sub: `По календарю (${detectSeason().label})`, dotColor: '#c084fc' },
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

  const switchSeason = (id: SeasonId | 'auto') => {
    haptic('light');
    setStoredSeason(id);
    const updated = getStoredSeason();
    applySeason(updated.season);
    setSeasonState(updated);
  };

  // Данные пользователя
  const effectiveUsername = user?.username || telegramUsername;
  const access = resolveUserAccess(effectiveUsername || '');

  const isAdminUser = access.isAdmin;
  const effectivePremium = access.isVip || isPremium;

  const displayName =
    user?.first_name || user?.username || effectiveUsername || 'Киноман ZENOVA';
  const username = user?.username
    ? `@${user.username}`
    : effectiveUsername
    ? `@${effectiveUsername.replace(/^@/, '')}`
    : 'ID Гостя';

  // Расчет ранга и очков опыта
  const trackedList = Object.values(tracked || {});
  const trackedCount = trackedList.length;
  const watchedCount = trackedList.filter((t) => t.status === 'watched').length;
  const totalXp = watchedCount * 45 + favorites.length * 30 + trackedCount * 25 + (effectivePremium ? 250 : 0);
  const cineLevel = Math.max(1, Math.floor(totalXp / 140) + 1);
  const levelProgress = Math.min(100, Math.round(((totalXp % 140) / 140) * 100));

  let rankTitle = 'Кинолюбитель';
  if (cineLevel >= 21) rankTitle = 'Легенда Кино';
  else if (cineLevel >= 13) rankTitle = 'Кинокритик';
  else if (cineLevel >= 6) rankTitle = 'Синефил';

  // Фильтрация дневника
  const filteredDiary = trackedList.filter((item) => {
    if (diaryFilter === 'all') return true;
    return item.status === diaryFilter;
  });

  /* ══════════════ ПОДСТРАНИЦА: КИНО-ДНЕВНИК ══════════════ */
  if (subPage === 'diary') {
    return (
      <div className="zen-subpage">
        <header className="zen-subpage__nav">
          <button
            type="button"
            className="zen-subpage__back"
            onClick={() => {
              haptic('light');
              setSubPage(null);
            }}
          >
            <ChevronLeft size={18} />
            <span>Назад</span>
          </button>
          <h1 className="zen-subpage__title">Кино-Дневник</h1>
          <div className="zen-subpage__action-space" />
        </header>

        <div className="zen-subpage__body">
          {/* Фильтры статуса */}
          <div className="zen-segmented">
            {[
              { id: 'all', label: `Все (${trackedList.length})` },
              { id: 'watched', label: 'Просмотрено' },
              { id: 'want', label: 'В планах' },
              { id: 'watching', label: 'Смотрю' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`zen-segmented__item ${diaryFilter === f.id ? 'active' : ''}`}
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
            <div className="zen-empty-state">
              <span className="zen-empty-state__icon"><BookOpen size={36} /></span>
              <h3 className="zen-empty-state__title">Дневник пока пуст</h3>
              <p className="zen-empty-state__text">
                Отмечайте фильмы на странице кино («Смотрю», «Буду смотреть» или «Просмотрено»), и они появятся в вашем личном дневнике.
              </p>
              <button
                type="button"
                className="zen-empty-state__btn"
                onClick={() => navigate('/')}
              >
                Выбрать фильм
              </button>
            </div>
          ) : (
            <div className="zen-diary-grid">
              {filteredDiary.map((item) => (
                <div
                  key={item.movie.id}
                  className="zen-diary-card"
                  onClick={() => {
                    haptic('light');
                    navigate(`/movie/${item.movie.id}`);
                  }}
                >
                  <img
                    src={item.movie.poster_path || ''}
                    alt={item.movie.title}
                    className="zen-diary-card__poster"
                    loading="lazy"
                  />
                  <div className="zen-diary-card__content">
                    <div className="zen-diary-card__head">
                      <span className={`zen-diary-badge ${item.status}`}>
                        {item.status === 'watched'
                          ? 'Просмотрено'
                          : item.status === 'want'
                          ? 'В планах'
                          : 'Смотрю'}
                      </span>
                      {item.rating && (
                        <span className="zen-diary-rating">★ {item.rating}</span>
                      )}
                    </div>
                    <div className="zen-diary-card__title">{item.movie.title}</div>
                    <div className="zen-diary-card__meta">
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
      <div className="zen-subpage">
        <header className="zen-subpage__nav">
          <button
            type="button"
            className="zen-subpage__back"
            onClick={() => {
              haptic('light');
              setSubPage(null);
            }}
          >
            <ChevronLeft size={18} />
            <span>Назад</span>
          </button>
          <h1 className="zen-subpage__title">Рейтинг & Награды</h1>
          <div className="zen-subpage__action-space" />
        </header>

        <div className="zen-subpage__body">
          {/* Карточка текущего ранга */}
          <div className="zen-rank-hero">
            <div className="zen-rank-hero__beam" />
            <div className="zen-rank-hero__badge">УРОВЕНЬ {cineLevel}</div>
            <h2 className="zen-rank-hero__title">{rankTitle}</h2>
            <div className="zen-rank-hero__bar">
              <div
                className="zen-rank-hero__fill"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            <div className="zen-rank-hero__xp">
              <span>{totalXp % 140} XP</span>
              <span>140 XP до следующего ранга</span>
            </div>
          </div>

          <div className="zen-section-header">КАК ПОЛУЧАТЬ ОПЫТ (XP)</div>
          <div className="zen-group">
            <div className="zen-row">
              <span className="zen-row__icon-wrap"><Tv size={18} /></span>
              <div className="zen-row__info">
                <div className="zen-row__title">Просмотр фильма</div>
                <div className="zen-row__sub">За каждый просмотр в плеере</div>
              </div>
              <span className="zen-row__val text-accent">+45 XP</span>
            </div>
            <div className="zen-row">
              <span className="zen-row__icon-wrap"><Star size={18} /></span>
              <div className="zen-row__info">
                <div className="zen-row__title">Добавление в Избранное</div>
                <div className="zen-row__sub">За сохранение фильма в коллекцию</div>
              </div>
              <span className="zen-row__val text-accent">+30 XP</span>
            </div>
            <div className="zen-row">
              <span className="zen-row__icon-wrap"><BookOpen size={18} /></span>
              <div className="zen-row__info">
                <div className="zen-row__title">Запись в Кино-Дневник</div>
                <div className="zen-row__sub">За оценку и статус релиза</div>
              </div>
              <span className="zen-row__val text-accent">+25 XP</span>
            </div>
            <div className="zen-row">
              <span className="zen-row__icon-wrap"><Crown size={18} /></span>
              <div className="zen-row__info">
                <div className="zen-row__title">Статус ZENOVA PRO</div>
                <div className="zen-row__sub">Ежемесячный бонус подписчика</div>
              </div>
              <span className="zen-row__val text-accent">+250 XP</span>
            </div>
          </div>

          <div className="zen-section-header">РЕЙТИНГОВЫЕ ПРИВИЛЕГИИ</div>
          <div className="zen-tiers">
            <div className={`zen-tier ${cineLevel >= 1 ? 'unlocked' : ''}`}>
              <div className="zen-tier__head">
                <span className="zen-tier__lvl">1–5 LVL</span>
                <span className="zen-tier__name">Кинолюбитель</span>
              </div>
              <p className="zen-tier__desc">Базовый HD доступ, сохранение в облако Telegram и синхронизация.</p>
            </div>

            <div className={`zen-tier ${cineLevel >= 6 ? 'unlocked' : ''}`}>
              <div className="zen-tier__head">
                <span className="zen-tier__lvl">6–12 LVL</span>
                <span className="zen-tier__name">Синефил</span>
              </div>
              <p className="zen-tier__desc">Кастомный неоновый градиент никнейма, эксклюзивные кино-темы профиля.</p>
            </div>

            <div className={`zen-tier ${cineLevel >= 13 ? 'unlocked' : ''}`}>
              <div className="zen-tier__head">
                <span className="zen-tier__lvl">13–20 LVL</span>
                <span className="zen-tier__name">Кинокритик</span>
              </div>
              <p className="zen-tier__desc">Золотой значок Критика в дневнике, автовыбор высшего битрейта (4K Ultra HD).</p>
            </div>

            <div className={`zen-tier ${cineLevel >= 21 ? 'unlocked' : ''}`}>
              <div className="zen-tier__head">
                <span className="zen-tier__lvl">21–30 LVL</span>
                <span className="zen-tier__name">Легенда Кино</span>
              </div>
              <p className="zen-tier__desc">Перламутровая рамка аватара, бессрочный статус VIP амбассадора ZENOVA.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════ ПОДСТРАНИЦА: ПРИВИЛЕГИИ PRO ══════════════ */
  if (subPage === 'pro') {
    return (
      <div className="zen-subpage">
        <header className="zen-subpage__nav">
          <button
            type="button"
            className="zen-subpage__back"
            onClick={() => {
              haptic('light');
              setSubPage(null);
            }}
          >
            <ChevronLeft size={18} />
            <span>Назад</span>
          </button>
          <h1 className="zen-subpage__title">ZENOVA PRO</h1>
          <div className="zen-subpage__action-space" />
        </header>

        <div className="zen-subpage__body">
          <div className="zen-pro-card">
            <div className="zen-pro-card__beam" />
            <div className="zen-pro-card__icon-wrap">
              <Crown size={32} />
            </div>
            <div className="zen-pro-card__status">
              {effectivePremium ? 'ПОДПИСКА PRO АКТИВНА' : 'БАЗОВЫЙ ДОСТУП'}
            </div>
            <h2 className="zen-pro-card__title">Премиум возможности</h2>
            <p className="zen-pro-card__desc">
              Максимальное качество видео, пространственный звук и полный кинематографичный комфорт.
            </p>

            <div className="zen-pro-features">
              <div className="zen-pro-feat">
                <Check size={16} className="zen-pro-feat__check" />
                <span>4K Ultra HD & Dolby Atmos</span>
              </div>
              <div className="zen-pro-feat">
                <Check size={16} className="zen-pro-feat__check" />
                <span>Полное отсутствие рекламы</span>
              </div>
              <div className="zen-pro-feat">
                <Check size={16} className="zen-pro-feat__check" />
                <span>Стриминг полных треков в музыке</span>
              </div>
              <div className="zen-pro-feat">
                <Check size={16} className="zen-pro-feat__check" />
                <span>Эксклюзивные сезонные темы и атмосфера</span>
              </div>
            </div>

            <button
              type="button"
              className="zen-btn-primary"
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

  /* ══════════════ ПОДСТРАНИЦА: АТМОСФЕРА И ТЕМЫ ══════════════ */
  if (subPage === 'atmosphere') {
    return (
      <div className="zen-subpage">
        <header className="zen-subpage__nav">
          <button
            type="button"
            className="zen-subpage__back"
            onClick={() => {
              haptic('light');
              setSubPage(null);
            }}
          >
            <ChevronLeft size={18} />
            <span>Назад</span>
          </button>
          <h1 className="zen-subpage__title">Атмосфера и темы</h1>
          <div className="zen-subpage__action-space" />
        </header>

        <div className="zen-subpage__body">
          <div className="zen-section-header">ВИЗУАЛЬНЫЕ ЭФФЕКТЫ</div>
          <div className="zen-group">
            <div className="zen-row">
              <span className="zen-row__icon-wrap"><Sparkles size={18} /></span>
              <div className="zen-row__info">
                <div className="zen-row__title">Северное Сияние</div>
                <div className="zen-row__sub">Плавные переливы полярной авроры вверху экрана</div>
              </div>
              <button
                type="button"
                className={`zen-toggle ${auroraOff ? '' : 'on'}`}
                onClick={toggleAurora}
              >
                <span className="zen-toggle__thumb" />
              </button>
            </div>

            <div className="zen-row">
              <span className="zen-row__icon-wrap"><Flame size={18} /></span>
              <div className="zen-row__info">
                <div className="zen-row__title">Сезонные частицы</div>
                <div className="zen-row__sub">Снегопад, лепестки сакуры, листопад</div>
              </div>
              <button
                type="button"
                className={`zen-toggle ${fxOff ? '' : 'on'}`}
                onClick={toggleFx}
              >
                <span className="zen-toggle__thumb" />
              </button>
            </div>
          </div>

          <div className="zen-section-header">СЕЗОННЫЕ ТЕМЫ</div>
          <div className="zen-group">
            {SEASONS.map((s) => {
              const isSelected =
                (seasonState.auto && s.id === 'auto') ||
                (!seasonState.auto && seasonState.season.id === s.id);
              return (
                <div
                  key={s.id}
                  className="zen-row clickable"
                  onClick={() => switchSeason(s.id)}
                >
                  <span
                    className="zen-season-dot"
                    style={{
                      background: s.dotColor,
                      boxShadow: `0 0 10px ${s.dotColor}88`,
                    }}
                  />
                  <div className="zen-row__info">
                    <div className="zen-row__title">{s.name}</div>
                    <div className="zen-row__sub">{s.sub}</div>
                  </div>
                  {isSelected && <Check size={18} className="zen-check" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════ ПОДСТРАНИЦА: ИСТОРИЯ ══════════════ */
  if (subPage === 'history') {
    return (
      <div className="zen-subpage">
        <header className="zen-subpage__nav">
          <button
            type="button"
            className="zen-subpage__back"
            onClick={() => {
              haptic('light');
              setSubPage(null);
            }}
          >
            <ChevronLeft size={18} />
            <span>Назад</span>
          </button>
          <h1 className="zen-subpage__title">История просмотров</h1>
          {watchHistory.length > 0 && (
            <button
              type="button"
              className="zen-subpage__action"
              onClick={() => {
                haptic('heavy');
                clearHistory();
              }}
            >
              Очистить
            </button>
          )}
        </header>

        <div className="zen-subpage__body">
          {watchHistory.length === 0 ? (
            <div className="zen-empty-state">
              <span className="zen-empty-state__icon"><HistoryIcon size={36} /></span>
              <h3 className="zen-empty-state__title">История пуста</h3>
              <p className="zen-empty-state__text">Здесь будут отображаться фильмы, которые вы начали смотреть.</p>
            </div>
          ) : (
            <div className="zen-group">
              {watchHistory.map((item) => {
                const m = item.movie;
                return (
                  <div
                    key={m.id}
                    className="zen-row clickable"
                    onClick={() => {
                      haptic('light');
                      navigate(`/movie/${m.id}`);
                    }}
                  >
                    <img
                      src={m.poster_path}
                      alt=""
                      className="zen-history-poster"
                    />
                    <div className="zen-row__info">
                      <div className="zen-row__title">{m.title}</div>
                      <div className="zen-row__sub">{m.release_date?.slice(0, 4) || 'Кино'}</div>
                    </div>
                    <ChevronRight size={16} className="zen-chevron" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══════════════ ГЛАВНЫЙ ЭКРАН ПРОФИЛЯ (Obsidian Dock Layout) ══════════════ */
  return (
    <div className="zen-profile-page page">
      {/* Шапка профиля */}
      <header className="zen-header">
        <h1 className="zen-header__title">Профиль</h1>
        {isAdminUser && (
          <button
            type="button"
            className="zen-admin-btn"
            onClick={() => navigate('/admin')}
          >
            Админка
          </button>
        )}
      </header>

      {/* Карточка пользователя с рангом */}
      <div className="zen-user-card" onClick={() => setSubPage('rank')}>
        <div className="zen-user-card__beam" />
        <div className="zen-user-card__top">
          <div className="zen-user-avatar-wrap">
            <div className="zen-user-avatar">
              {user?.photo_url ? (
                <img src={user.photo_url} alt={displayName} className="zen-user-avatar__img" />
              ) : (
                <img
                  src={seasonState.season.id === 'winter' ? '/zenova-mask-winter.png' : '/zenova-mask-default.png'}
                  alt=""
                  className="zen-user-avatar__mask"
                />
              )}
            </div>
            {effectivePremium && <span className="zen-user-pro-badge">PRO</span>}
            <span className="zen-user-lvl-pill">LVL {cineLevel}</span>
          </div>

          <div className="zen-user-info">
            <div className="zen-user-kicker">РЕЗИДЕНТ ZENOVA</div>
            <h2 className="zen-user-name">{displayName}</h2>
            <div className="zen-user-meta">
              <span className="zen-user-handle">{username}</span>
              <span className="zen-user-rank-chip">{rankTitle}</span>
            </div>
          </div>
          <ChevronRight size={18} className="zen-chevron" />
        </div>

        {/* Шкала ранга */}
        <div className="zen-user-rank-bar">
          <div className="zen-user-rank-track">
            <div
              className="zen-user-rank-fill"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <div className="zen-user-rank-labels">
            <span className="zen-user-rank-title">Ранг: {rankTitle}</span>
            <span className="zen-user-rank-pts">{totalXp % 140} / 140 XP</span>
          </div>
        </div>
      </div>

      {/* ── ГРУППА 1: МОЁ КИНО ── */}
      <div className="zen-section-header">МОЁ КИНО</div>
      <div className="zen-group">
        <div
          className="zen-row clickable"
          onClick={() => {
            haptic('light');
            setSubPage('diary');
          }}
        >
          <span className="zen-row__icon-wrap">
            <BookOpen size={18} />
          </span>
          <div className="zen-row__info">
            <div className="zen-row__title">Кино-Дневник & Оценки</div>
            <div className="zen-row__sub">Смотрю, в планах, просмотрено</div>
          </div>
          <span className="zen-row__val">{trackedCount > 0 ? `${trackedCount}` : '—'}</span>
          <ChevronRight size={16} className="zen-chevron" />
        </div>

        <div
          className="zen-row clickable"
          onClick={() => {
            haptic('light');
            setSubPage('history');
          }}
        >
          <span className="zen-row__icon-wrap">
            <HistoryIcon size={18} />
          </span>
          <div className="zen-row__info">
            <div className="zen-row__title">История просмотров</div>
            <div className="zen-row__sub">Недавно открытые фильмы</div>
          </div>
          <span className="zen-row__val">{watchHistory.length > 0 ? `${watchHistory.length}` : '—'}</span>
          <ChevronRight size={16} className="zen-chevron" />
        </div>

        <div
          className="zen-row clickable"
          onClick={() => {
            haptic('light');
            navigate('/favorites');
          }}
        >
          <span className="zen-row__icon-wrap">
            <Star size={18} />
          </span>
          <div className="zen-row__info">
            <div className="zen-row__title">Избранное & Закладки</div>
            <div className="zen-row__sub">Сохранённые фильмы</div>
          </div>
          <span className="zen-row__val">{favorites.length > 0 ? `${favorites.length}` : '—'}</span>
          <ChevronRight size={16} className="zen-chevron" />
        </div>
      </div>

      {/* ── ГРУППА 2: ПРИВИЛЕГИИ ── */}
      <div className="zen-section-header">ПРИВИЛЕГИИ</div>
      <div className="zen-group">
        <div
          className="zen-row clickable"
          onClick={() => {
            haptic('light');
            setSubPage('pro');
          }}
        >
          <span className="zen-row__icon-wrap zen-glow-gold">
            <Crown size={18} />
          </span>
          <div className="zen-row__info">
            <div className="zen-row__title">ZENOVA PRO</div>
            <div className="zen-row__sub">4K HDR, Dolby Atmos, без рекламы</div>
          </div>
          <span className={`zen-row__val ${effectivePremium ? 'text-green' : 'text-gold'}`}>
            {effectivePremium ? 'Активен' : 'Подключить'}
          </span>
          <ChevronRight size={16} className="zen-chevron" />
        </div>

        <div
          className="zen-row clickable"
          onClick={() => {
            haptic('light');
            setSubPage('rank');
          }}
        >
          <span className="zen-row__icon-wrap">
            <Trophy size={18} />
          </span>
          <div className="zen-row__info">
            <div className="zen-row__title">Рейтинговые Награды</div>
            <div className="zen-row__sub">Как получать опыт и ранги</div>
          </div>
          <span className="zen-row__val">{rankTitle}</span>
          <ChevronRight size={16} className="zen-chevron" />
        </div>
      </div>

      {/* ── ГРУППА 3: АТМОСФЕРА И ТЕМЫ (БЕЗ СВЕТЛОЙ ТЕМЫ) ── */}
      <div className="zen-section-header">ПЕРСОНАЛИЗАЦИЯ</div>
      <div className="zen-group">
        <div
          className="zen-row clickable"
          onClick={() => {
            haptic('light');
            setSubPage('atmosphere');
          }}
        >
          <span className="zen-row__icon-wrap zen-glow-cyan">
            <Sparkles size={18} />
          </span>
          <div className="zen-row__info">
            <div className="zen-row__title">Атмосфера и темы</div>
            <div className="zen-row__sub">Северное сияние, снег и сезоны</div>
          </div>
          <span className="zen-row__val">{auroraOff ? 'Сияние выкл' : 'Активно'}</span>
          <ChevronRight size={16} className="zen-chevron" />
        </div>
      </div>

      {/* ── ГРУППА 4: ИНФОРМАЦИЯ & ВЫХОД ── */}
      <div className="zen-section-header">ПРИЛОЖЕНИЕ</div>
      <div className="zen-group">
        <div
          className="zen-row clickable"
          onClick={() => {
            haptic('light');
            setShowRules(true);
          }}
        >
          <span className="zen-row__icon-wrap">
            <ShieldCheck size={18} />
          </span>
          <div className="zen-row__info">
            <div className="zen-row__title">Правила и соглашение</div>
            <div className="zen-row__sub">Пользовательские условия</div>
          </div>
          <ChevronRight size={16} className="zen-chevron" />
        </div>

        <div
          className="zen-row clickable"
          onClick={() => {
            haptic('medium');
            closeApp();
          }}
        >
          <span className="zen-row__icon-wrap text-danger">
            <LogOut size={18} />
          </span>
          <div className="zen-row__info">
            <div className="zen-row__title text-danger">Закрыть ZENOVA</div>
          </div>
          <ChevronRight size={16} className="zen-chevron" />
        </div>
      </div>

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
};

export default ProfilePage;
