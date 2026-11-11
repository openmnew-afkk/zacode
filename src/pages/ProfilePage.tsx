import React, { useState, useMemo } from 'react';
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
  CheckCircle2,
  Wrench,
  Copy,
  Search,
  Trash2,
  Lock,
  Gift,
  Zap,
  Eye,
  Sliders,
  ExternalLink,
  Radio,
} from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import { resolveUserAccess } from '../services/accessControl';
import { getStoredSeason, setStoredSeason, applySeason, detectSeason } from '../services/seasons';
import type { SeasonId } from '../services/seasons';
import { triggerSeasonalBurst } from '../components/SeasonFx';
import { RULES_SECTIONS } from '../data/rules';
import type { Movie, WatchStatus } from '../types';
import './ProfilePage.css';

type SubPage = 'library' | 'rank' | 'pro' | 'atmosphere' | 'news' | 'rules' | null;

interface ChangeEntry {
  type: 'fixed' | 'improved' | 'new';
  title: string;
  desc: string;
}

interface ReleaseNote {
  version: string;
  date: string;
  badge?: string;
  headline: string;
  changes: ChangeEntry[];
}

const CHANGELOG: ReleaseNote[] = [
  {
    version: '3.3.2',
    date: '11 ноября 2026',
    badge: 'СВЕЖЕЕ ОБНОВЛЕНИЕ',
    headline: 'Единая Кинотека, роскошный ZENOVA PRO, стабильный полный экран и новый дизайн',
    changes: [
      {
        type: 'new',
        title: 'Единая Кинотека и Дневник',
        desc: 'Объединили Избранное, Историю просмотров и Дневник в один мощный центр управления с поиском, фильтрами и быстрыми действиями.',
      },
      {
        type: 'improved',
        title: 'Переработанный ZENOVA PRO',
        desc: 'Сделали статус PRO настоящей привилегией: 8 элитных возможностей, x2 опыт, 4K HDR, Dolby Atmos и бесплатный 3-дневный пробный период.',
      },
      {
        type: 'fixed',
        title: 'Устранены вылеты в оконный режим',
        desc: 'Telegram теперь непрерывно держит полный экран под телефон при выходе из плеера, переходе между вкладками и закрытии диалогов.',
      },
      {
        type: 'new',
        title: 'Умный поисковик в Кино-Оракуле',
        desc: 'В Оракул встроен фирменный поиск с неоновой посимвольной подсветкой ввода в стиле Яндекс Музыки.',
      },
      {
        type: 'new',
        title: 'Видео-презентация Synthax AI',
        desc: 'Раздел нейросети переведён в статус R&D разработки — добавлен интерактивный кибер-плеер с демонстрацией кинетики и будущего рендеринга.',
      },
    ],
  },
  {
    version: '3.3.1',
    date: '10 ноября 2026',
    headline: 'Архитектурный Smoked-Obsidian стиль и безопасные зоны Telegram',
    changes: [
      {
        type: 'improved',
        title: 'Гармония с доком TabBar',
        desc: 'Настройки переведены на архитектурный обсидиановый стиль с верхним световым лучом и минималистичными контурными иконками.',
      },
      {
        type: 'fixed',
        title: 'Отступы под нативные кнопки Telegram',
        desc: 'Шапка опущена ниже системных кнопок закрытия и меню в полноэкранном режиме iOS и Android.',
      },
      {
        type: 'new',
        title: 'Сезонные темы и Северное Сияние',
        desc: 'Добавлены атмосферные темы (Зимний Кристалл, Сакура, Лазурный Бриз, Янтарь, Обсидиан) с деликатными микро-частицами.',
      },
    ],
  },
  {
    version: '3.3.0',
    date: '8 ноября 2026',
    headline: 'Кино-Оракул, Музыкальный хаб и Кино-Дневник',
    changes: [
      {
        type: 'new',
        title: 'Кино-Оракул под настроение',
        desc: 'Интерактивные карточки со свайп-механикой для быстрого выбора фильма за пару касаний.',
      },
      {
        type: 'new',
        title: 'Стриминг музыки из фильмов',
        desc: 'Аудиоплеер с саундтреками, плейлистами и быстрым поиском треков.',
      },
      {
        type: 'new',
        title: 'Личный Кино-Дневник и ранги',
        desc: 'Отметки «Смотрю», «В планах», «Просмотрено», рейтинговые привилегии и синхронизация через Telegram CloudStorage.',
      },
    ],
  },
];

interface ThemeOption {
  id: SeasonId | 'auto';
  name: string;
  sub: string;
  badge: string;
  palette: string[];
  gradient: string;
  fxName: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'winter',
    name: 'Зимний Кристалл',
    sub: 'Северное сияние, 3D-снег и ледяные кристаллы',
    badge: 'СЕЗОННАЯ',
    palette: ['#38bdf8', '#10b981', '#0f172a'],
    gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)',
    fxName: 'Полярная Аврора + Снег',
  },
  {
    id: 'spring',
    name: 'Цветение Сакуры',
    sub: 'Нежный весенний ветер и лепестки сакуры',
    badge: 'ВЕСЕННЯЯ',
    palette: ['#f472b6', '#a855f7', '#180a1c'],
    gradient: 'linear-gradient(135deg, rgba(244, 114, 182, 0.22) 0%, rgba(24, 10, 28, 0.95) 100%)',
    fxName: 'Розовые лепестки',
  },
  {
    id: 'summer',
    name: 'Лазурный Бриз',
    sub: 'Теплые солнечные блики и ночные светлячки',
    badge: 'ЛЕТНЯЯ',
    palette: ['#fbbf24', '#06b6d4', '#1c1208'],
    gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.22) 0%, rgba(28, 18, 8, 0.95) 100%)',
    fxName: 'Золотые светлячки',
  },
  {
    id: 'autumn',
    name: 'Янтарный Закат',
    sub: 'Бархатный уют, медовые тона и листопад',
    badge: 'ОСЕННЯЯ',
    palette: ['#fb923c', '#ef4444', '#1f0e08'],
    gradient: 'linear-gradient(135deg, rgba(251, 146, 60, 0.22) 0%, rgba(31, 14, 8, 0.95) 100%)',
    fxName: 'Медный листопад',
  },
  {
    id: 'none',
    name: 'Глубокий Обсидиан',
    sub: 'Чистый кинематографичный кинозал без частиц',
    badge: 'OLED ЧЁРНЫЙ',
    palette: ['#ffffff', '#94a3b8', '#09080b'],
    gradient: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(9, 8, 11, 0.98) 100%)',
    fxName: 'Без частиц (Focus Mode)',
  },
  {
    id: 'auto',
    name: 'Авто-сезон',
    sub: `Автоматическая смена по календарю (${detectSeason().label})`,
    badge: 'КАЛЕНДАРЬ',
    palette: ['#c084fc', '#38bdf8', '#0c0a18'],
    gradient: 'linear-gradient(135deg, rgba(192, 132, 252, 0.22) 0%, rgba(12, 10, 24, 0.95) 100%)',
    fxName: 'Смена эффектов по дате',
  },
];

interface LibraryItem {
  id: string;
  movie: Movie;
  status: WatchStatus | null;
  isFav: boolean;
  isHistory: boolean;
  rating?: number | null;
  timestamp: number;
}

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
    activatePremiumDays,
  } = useStore();

  const [subPage, setSubPage] = useState<SubPage>(null);
  const [libraryTab, setLibraryTab] = useState<'all' | 'favorites' | 'history' | 'watched' | 'want' | 'watching'>('all');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [rulesCategory, setRulesCategory] = useState<'security' | 'content' | 'pro' | 'community'>('security');
  const [copiedId, setCopiedId] = useState(false);
  const [claimedTrial, setClaimedTrial] = useState(false);
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
    : `ID: ${user?.id || 'Гость'}`;

  // Копирование ID пользователя
  const handleCopyHandle = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic('light');
    try {
      navigator.clipboard?.writeText(username);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {}
  };

  // Активация 3 дней PRO в качестве подарка/пробного периода
  const handleClaimTrial = () => {
    haptic('heavy');
    activatePremiumDays(3);
    setClaimedTrial(true);
    triggerSeasonalBurst(window.innerWidth / 2, window.innerHeight / 2, true, 'winter');
  };

  // ══════════════ ОБЪЕДИНЕННАЯ КИНОТЕКА (Единый хаб) ══════════════
  const allLibraryItems = useMemo<LibraryItem[]>(() => {
    const map = new Map<string, LibraryItem>();

    // 1. Tracked (Дневник: Смотрю, В планах, Просмотрено)
    Object.values(tracked || {}).forEach((t) => {
      const id = String(t.movie.id);
      map.set(id, {
        id,
        movie: t.movie,
        status: t.status,
        isFav: false,
        isHistory: false,
        rating: t.rating,
        timestamp: t.addedAt || t.updatedAt || Date.now(),
      });
    });

    // 2. Favorites (Избранное)
    favorites.forEach((m) => {
      const id = String(m.id);
      const existing = map.get(id);
      if (existing) {
        existing.isFav = true;
      } else {
        map.set(id, {
          id,
          movie: m,
          status: null,
          isFav: true,
          isHistory: false,
          timestamp: Date.now(),
        });
      }
    });

    // 3. WatchHistory (История)
    watchHistory.forEach((h) => {
      const id = String(h.movie.id);
      const existing = map.get(id);
      if (existing) {
        existing.isHistory = true;
        if (h.watchedAt) existing.timestamp = Math.max(existing.timestamp, h.watchedAt);
      } else {
        map.set(id, {
          id,
          movie: h.movie,
          status: null,
          isFav: false,
          isHistory: true,
          timestamp: h.watchedAt || Date.now(),
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [tracked, favorites, watchHistory]);

  // Фильтрация Кинотеки
  const filteredLibrary = useMemo(() => {
    let list = allLibraryItems;

    if (libraryTab === 'favorites') {
      list = list.filter((i) => i.isFav);
    } else if (libraryTab === 'history') {
      list = list.filter((i) => i.isHistory);
    } else if (libraryTab === 'watched') {
      list = list.filter((i) => i.status === 'watched');
    } else if (libraryTab === 'want') {
      list = list.filter((i) => i.status === 'want');
    } else if (libraryTab === 'watching') {
      list = list.filter((i) => i.status === 'watching');
    }

    if (libraryQuery.trim()) {
      const q = libraryQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.movie.title?.toLowerCase().includes(q) ||
          i.movie.genres?.some((g) => g.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allLibraryItems, libraryTab, libraryQuery]);

  // Подсчёт статистики
  const watchedCount = allLibraryItems.filter((i) => i.status === 'watched').length;
  const wantCount = allLibraryItems.filter((i) => i.status === 'want').length;
  const watchingCount = allLibraryItems.filter((i) => i.status === 'watching').length;
  const totalSavedCount = allLibraryItems.length;

  const totalXp = watchedCount * 45 + favorites.length * 30 + Object.keys(tracked || {}).length * 25 + (effectivePremium ? 250 : 0);
  const cineLevel = Math.max(1, Math.floor(totalXp / 140) + 1);
  const levelProgress = Math.min(100, Math.round(((totalXp % 140) / 140) * 100));

  let rankTitle = 'Кинолюбитель';
  if (cineLevel >= 21) rankTitle = 'Легенда Кино';
  else if (cineLevel >= 13) rankTitle = 'Кинокритик';
  else if (cineLevel >= 6) rankTitle = 'Синефил';

  // Дней до окончания PRO
  const proDaysLeft = useMemo(() => {
    if (!premiumExpiry) return null;
    const diff = premiumExpiry - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [premiumExpiry]);

  /* ══════════════ ПОДСТРАНИЦА: ЕДИНАЯ КИНОТЕКА & ДНЕВНИК ══════════════ */
  if (subPage === 'library') {
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
          <h1 className="zen-subpage__title">Моя Кинотека</h1>
          {libraryTab === 'history' && watchHistory.length > 0 ? (
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
          ) : (
            <div className="zen-subpage__action-space" />
          )}
        </header>

        <div className="zen-subpage__body">
          {/* Сводка Кинотеки */}
          <div className="zen-lib-hero">
            <div className="zen-lib-hero__stat">
              <span className="zen-lib-hero__num">{totalSavedCount}</span>
              <span className="zen-lib-hero__lbl">Всего в базе</span>
            </div>
            <div className="zen-lib-hero__divider" />
            <div className="zen-lib-hero__stat">
              <span className="zen-lib-hero__num text-green">{watchedCount}</span>
              <span className="zen-lib-hero__lbl">Просмотрено</span>
            </div>
            <div className="zen-lib-hero__divider" />
            <div className="zen-lib-hero__stat">
              <span className="zen-lib-hero__num text-gold">{favorites.length}</span>
              <span className="zen-lib-hero__lbl">Избранное</span>
            </div>
            <div className="zen-lib-hero__divider" />
            <div className="zen-lib-hero__stat">
              <span className="zen-lib-hero__num text-cyan">{wantCount}</span>
              <span className="zen-lib-hero__lbl">В планах</span>
            </div>
          </div>

          {/* Поиск внутри библиотеки */}
          <div className="zen-lib-search">
            <Search size={16} className="zen-lib-search__icon" />
            <input
              type="text"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="Поиск по названию или жанру в коллекции…"
              className="zen-lib-search__input"
            />
            {libraryQuery && (
              <button
                type="button"
                className="zen-lib-search__clear"
                onClick={() => setLibraryQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Сегментированные вкладки Кинотеки */}
          <div className="zen-lib-tabs">
            {[
              { id: 'all', label: `Все (${allLibraryItems.length})`, icon: '✦' },
              { id: 'favorites', label: `Избранное (${favorites.length})`, icon: '★' },
              { id: 'history', label: `История (${watchHistory.length})`, icon: '⏱' },
              { id: 'watched', label: `Просмотрено (${watchedCount})`, icon: '✓' },
              { id: 'want', label: `В планах (${wantCount})`, icon: '📌' },
              { id: 'watching', label: `Смотрю (${watchingCount})`, icon: '▶' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`zen-lib-tab ${libraryTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  haptic('light');
                  setLibraryTab(tab.id as any);
                }}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Список фильмов */}
          {filteredLibrary.length === 0 ? (
            <div className="zen-empty-state">
              <span className="zen-empty-state__icon"><BookOpen size={36} /></span>
              <h3 className="zen-empty-state__title">
                {libraryQuery ? 'Ничего не найдено' : 'Раздел пока пуст'}
              </h3>
              <p className="zen-empty-state__text">
                {libraryQuery
                  ? 'Попробуйте изменить поисковый запрос'
                  : 'Добавляйте фильмы в избранное, отмечайте просмотр или просто запускайте кино в плеере.'}
              </p>
              <button
                type="button"
                className="zen-empty-state__btn"
                onClick={() => navigate('/')}
              >
                Найти фильм в каталоге
              </button>
            </div>
          ) : (
            <div className="zen-lib-grid">
              {filteredLibrary.map((item) => (
                <div
                  key={item.id}
                  className="zen-lib-card"
                  onClick={() => {
                    haptic('light');
                    navigate(`/movie/${item.movie.id}`);
                  }}
                >
                  <div className="zen-lib-card__poster-wrap">
                    <img
                      src={item.movie.poster_path || ''}
                      alt={item.movie.title}
                      className="zen-lib-card__poster"
                      loading="lazy"
                    />
                    {item.rating && (
                      <span className="zen-lib-card__rating">★ {item.rating}</span>
                    )}
                  </div>

                  <div className="zen-lib-card__content">
                    <div className="zen-lib-card__tags">
                      {item.isFav && <span className="zen-tag-fav">★ Избранное</span>}
                      {item.status === 'watched' && <span className="zen-tag-watched">✓ Просмотрено</span>}
                      {item.status === 'want' && <span className="zen-tag-want">📌 В планах</span>}
                      {item.status === 'watching' && <span className="zen-tag-watching">▶ Смотрю</span>}
                      {item.isHistory && !item.status && <span className="zen-tag-hist">⏱ История</span>}
                    </div>

                    <h4 className="zen-lib-card__title">{item.movie.title}</h4>
                    <div className="zen-lib-card__meta">
                      {item.movie.release_date?.slice(0, 4) || '—'} ·{' '}
                      {item.movie.genres?.[0] || 'Кино'}
                    </div>
                  </div>

                  <ChevronRight size={18} className="zen-chevron" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══════════════ ПОДСТРАНИЦА: ZENOVA PRO (КОНФЕТКА) ══════════════ */
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
          {/* Премиальная переливающаяся золотая VIP-карточка */}
          <div className={`zen-pro-hero ${effectivePremium ? 'is-active' : ''}`}>
            <div className="zen-pro-hero__beam" />
            <div className="zen-pro-hero__hologram" />

            <div className="zen-pro-hero__top">
              <div className="zen-pro-crown-pod">
                <Crown size={34} className="zen-pro-crown-icon" />
              </div>
              <div className="zen-pro-hero__badges">
                <span className="zen-pro-status-badge">
                  {effectivePremium ? '● ПОДПИСКА PRO АКТИВНА' : 'БАЗОВЫЙ ДОСТУП'}
                </span>
                {proDaysLeft !== null && proDaysLeft > 0 && (
                  <span className="zen-pro-days-badge">{proDaysLeft} дн. осталось</span>
                )}
                {effectivePremium && proDaysLeft === null && (
                  <span className="zen-pro-days-badge">БЕССРОЧНЫЙ VIP</span>
                )}
              </div>
            </div>

            <h2 className="zen-pro-hero__title">
              {effectivePremium ? 'Вы резидент ZENOVA PRO' : 'Откройте максимум кино-возможностей'}
            </h2>
            <p className="zen-pro-hero__lead">
              Абсолютный комфорт без сжатия, рекламы и задержек. Премиальный кинозал нового поколения.
            </p>

            <div className="zen-pro-xp-badge">
              <Zap size={14} className="text-gold" />
              <span>Бустер опыта: <b>x2 XP</b> за все действия в приложении</span>
            </div>
          </div>

          {/* 8 Элитных привилегий */}
          <div className="zen-section-header">ЭЛИТНЫЕ ПРИВИЛЕГИИ PRO</div>
          <div className="zen-pro-perks-grid">
            <div className="zen-perk-card">
              <div className="zen-perk-card__icon text-gold"><Tv size={20} /></div>
              <div className="zen-perk-card__info">
                <strong>4K Ultra HD & HDR10+</strong>
                <p>Автовыбор оригинального наивысшего битрейта без сжатия и потери деталей.</p>
              </div>
            </div>

            <div className="zen-perk-card">
              <div className="zen-perk-card__icon text-cyan"><Radio size={20} /></div>
              <div className="zen-perk-card__info">
                <strong>Dolby Atmos 3D Audio</strong>
                <p>Пространственный многоканальный звук с эффектом присутствия в зале.</p>
              </div>
            </div>

            <div className="zen-perk-card">
              <div className="zen-perk-card__icon text-green"><ShieldCheck size={20} /></div>
              <div className="zen-perk-card__info">
                <strong>Absolute Zero Ads</strong>
                <p>Полное отсутствие рекламы, спонсорских интеграций и всплывающих окон.</p>
              </div>
            </div>

            <div className="zen-perk-card">
              <div className="zen-perk-card__icon text-amber"><Zap size={20} /></div>
              <div className="zen-perk-card__info">
                <strong>Turbo Dedicated CDN</strong>
                <p>Мгновенный запуск видео за 0 секунд даже в вечерние часы пик.</p>
              </div>
            </div>

            <div className="zen-perk-card">
              <div className="zen-perk-card__icon text-purple"><Flame size={20} /></div>
              <div className="zen-perk-card__info">
                <strong>Full Lossless Music</strong>
                <p>Неограниченный стриминг полных саундтреков и треков в студийном качестве.</p>
              </div>
            </div>

            <div className="zen-perk-card">
              <div className="zen-perk-card__icon text-rose"><Sparkles size={20} /></div>
              <div className="zen-perk-card__info">
                <strong>ZENOVA AI Unlimited</strong>
                <p>Безлимитный Кино-Оракул и приоритетный доступ к будущему ядру Synthax-9.</p>
              </div>
            </div>

            <div className="zen-perk-card">
              <div className="zen-perk-card__icon text-gold"><Crown size={20} /></div>
              <div className="zen-perk-card__info">
                <strong>VIP Персонализация</strong>
                <p>Золотой никнейм, перламутровая окантовка аватара и эксклюзивные темы.</p>
              </div>
            </div>

            <div className="zen-perk-card">
              <div className="zen-perk-card__icon text-cyan"><Lock size={20} /></div>
              <div className="zen-perk-card__info">
                <strong>Telegram Cloud Sync</strong>
                <p>Бесконечная синхронизация библиотеки и истории на всех ваших устройствах.</p>
              </div>
            </div>
          </div>

          {/* Действия активации PRO */}
          <div className="zen-pro-action-box">
            {!effectivePremium ? (
              <>
                <button
                  type="button"
                  className="zen-btn-gold"
                  onClick={() => {
                    haptic('medium');
                    navigate('/premium');
                  }}
                >
                  <Crown size={18} />
                  <span>Подключить ZENOVA PRO ›</span>
                </button>

                {!claimedTrial && (
                  <button
                    type="button"
                    className="zen-btn-trial"
                    onClick={handleClaimTrial}
                  >
                    <Gift size={16} />
                    <span>Попробовать 3 дня бесплатно</span>
                  </button>
                )}
              </>
            ) : (
              <div className="zen-pro-active-banner">
                <div className="zen-pro-active-text">
                  <strong>Ваш статус ZENOVA PRO активен</strong>
                  <span>Все привилегии, 4K битрейт и бустер опыта включены.</span>
                </div>
                <button
                  type="button"
                  className="zen-btn-outline"
                  onClick={() => navigate('/premium')}
                >
                  Управление тарифом
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════ ПОДСТРАНИЦА: АТМОСФЕРА И ТЕМЫ (КРУТОЙ ДИЗАЙН) ══════════════ */
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
          {/* Визуальная карточка Северного Сияния */}
          <div className="zen-aurora-card">
            <div className="zen-aurora-preview">
              <div className="zen-aurora-ribbon zen-aurora-ribbon--1" />
              <div className="zen-aurora-ribbon zen-aurora-ribbon--2" />
            </div>
            <div className="zen-aurora-card__body">
              <div className="zen-aurora-card__info">
                <span className="zen-aurora-badge">ПОЛЯРНЫЙ ЭФФЕКТ</span>
                <h3 className="zen-aurora-title">Северное Сияние</h3>
                <p className="zen-aurora-desc">Живые переливы изумрудной и лазурной авроры вверху экрана.</p>
              </div>
              <button
                type="button"
                className={`zen-toggle ${auroraOff ? '' : 'on'}`}
                onClick={toggleAurora}
                aria-label="Включить Северное Сияние"
              >
                <span className="zen-toggle__thumb" />
              </button>
            </div>
          </div>

          {/* Визуальная карточка Сезонных Частиц */}
          <div className="zen-fx-card">
            <div className="zen-fx-card__body">
              <div className="zen-fx-card__info">
                <span className="zen-fx-badge">ЧАСТИЦЫ</span>
                <h3 className="zen-fx-title">Сезонные микро-частицы</h3>
                <p className="zen-fx-desc">Пушистый 3D-снегопад, лепестки сакуры, светлячки и листопад.</p>
              </div>
              <button
                type="button"
                className={`zen-toggle ${fxOff ? '' : 'on'}`}
                onClick={toggleFx}
                aria-label="Включить частицы"
              >
                <span className="zen-toggle__thumb" />
              </button>
            </div>
          </div>

          <div className="zen-section-header">КОЛЛЕКЦИЯ ТЕМАТИЧЕСКИХ АТМОСФЕР</div>
          <div className="zen-themes-catalog">
            {THEME_OPTIONS.map((t) => {
              const isSelected =
                (seasonState.auto && t.id === 'auto') ||
                (!seasonState.auto && seasonState.season.id === t.id);

              return (
                <div
                  key={t.id}
                  className={`zen-theme-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => switchSeason(t.id)}
                  style={{ background: t.gradient }}
                >
                  <div className="zen-theme-card__top">
                    <span className="zen-theme-badge">{t.badge}</span>
                    {isSelected && (
                      <span className="zen-theme-check-pill">
                        <Check size={13} />
                        <span>АКТИВНА</span>
                      </span>
                    )}
                  </div>

                  <h3 className="zen-theme-title">{t.name}</h3>
                  <p className="zen-theme-sub">{t.sub}</p>

                  <div className="zen-theme-bottom">
                    <div className="zen-theme-palette">
                      {t.palette.map((color, idx) => (
                        <span
                          key={idx}
                          className="zen-palette-dot"
                          style={{ background: color, boxShadow: `0 0 8px ${color}88` }}
                        />
                      ))}
                    </div>
                    <span className="zen-theme-fx-tag">{t.fxName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════ ПОДСТРАНИЦА: ПРАВИЛА И СОГЛАШЕНИЯ (ТОПОВЫЙ ДИЗАЙН) ══════════════ */
  if (subPage === 'rules') {
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
          <h1 className="zen-subpage__title">Правила & Безопасность</h1>
          <div className="zen-subpage__action-space" />
        </header>

        <div className="zen-subpage__body">
          {/* Сводка в 3 главных тезисах */}
          <div className="zen-rules-hero">
            <span className="zen-rules-hero__badge">
              <ShieldCheck size={13} />
              <span>ОФИЦИАЛЬНАЯ ПРАВОВАЯ ИНФОРМАЦИЯ</span>
            </span>
            <h2 className="zen-rules-hero__title">Безопасность и принципы ZENOVA</h2>
            <p className="zen-rules-hero__desc">
              Мы уважаем конфиденциальность пользователей и интеллектуальные права создателей контента.
            </p>

            <div className="zen-rules-highlights">
              <div className="zen-rule-hl">
                <span className="zen-rule-hl__icon">🔒</span>
                <strong>Конфиденциальность</strong>
                <small>Данные сохраняются локально и в Telegram Cloud</small>
              </div>
              <div className="zen-rule-hl">
                <span className="zen-rule-hl__icon">🛡️</span>
                <strong>DMCA & Каталог</strong>
                <small>Плееры транслируются из открытых внешних CDN</small>
              </div>
              <div className="zen-rule-hl">
                <span className="zen-rule-hl__icon">⚖️</span>
                <strong>Честность PRO</strong>
                <small>Без скрытых подписок, прозрачная оплата через Stars</small>
              </div>
            </div>
          </div>

          {/* Категории правил */}
          <div className="zen-rules-cat-tabs">
            {[
              { id: 'security', label: 'Безопасность' },
              { id: 'content', label: 'Каталог и DMCA' },
              { id: 'pro', label: 'Подписка PRO' },
              { id: 'community', label: 'Правила сервиса' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`zen-rules-cat-btn ${rulesCategory === cat.id ? 'active' : ''}`}
                onClick={() => {
                  haptic('light');
                  setRulesCategory(cat.id as any);
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Контент выбранной категории */}
          <div className="zen-rules-content-card">
            {rulesCategory === 'security' && (
              <div className="zen-rules-block">
                <h3>Защита аккаунта и конфиденциальность</h3>
                <p>
                  Все ваши персональные списки, закладки, оценки и история просмотров надёжно защищены. Мы не запрашиваем пароли, не собираем контактные данные и не передаём сведения третьим лицам.
                </p>
                <p>
                  Синхронизация происходит через официальный Telegram CloudStorage API без сторонних промежуточных баз данных.
                </p>
              </div>
            )}

            {rulesCategory === 'content' && (
              <div className="zen-rules-block">
                <h3>Каталог и взаимодействие с правообладателями</h3>
                <p>
                  ZENOVA является информационным каталогом и агрегатором сведений о фильмах, музыке и стриминговых релизах. Мы не храним медиа-файлы на собственных серверах.
                </p>
                <p>
                  Все видеопотоки транслируются напрямую из открытых сторонних источников. В случае вопросов правообладателей мы обеспечиваем оперативное рассмотрение обращений через официальный контакт в течение 24 часов.
                </p>
              </div>
            )}

            {rulesCategory === 'pro' && (
              <div className="zen-rules-block">
                <h3>Условия тарифов и ZENOVA PRO</h3>
                <p>
                  Подписка ZENOVA PRO активирует расширенные возможности интерфейса (отключение рекламы, доступ к 4K потокам, бустер опыта и эксклюзивные темы).
                </p>
                <p>
                  Все платежи осуществляются через официальную систему Telegram Stars с соблюдением правил платформы Telegram.
                </p>
              </div>
            )}

            {rulesCategory === 'community' && (
              <div className="zen-rules-block">
                <h3>Правила сообщества и добросовестное использование</h3>
                <p>
                  Пользователи соглашаются использовать приложение в законных личных целях, соблюдать авторские права и не использовать автоматизированные скрипты для перегрузки серверов.
                </p>
              </div>
            )}
          </div>

          <div className="zen-rules-contact-card">
            <div className="zen-rules-contact-text">
              <strong>Официальная поддержка и правообладателям</strong>
              <span>Связь с командой проекта через Telegram-бота</span>
            </div>
            <a
              href="https://t.me/zenovafilm"
              target="_blank"
              rel="noreferrer"
              className="zen-rules-contact-btn"
            >
              <span>Поддержка</span>
              <ExternalLink size={14} />
            </a>
          </div>
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

  /* ══════════════ ПОДСТРАНИЦА: ЧТО НОВОГО ══════════════ */
  if (subPage === 'news') {
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
          <h1 className="zen-subpage__title">Что нового</h1>
          <div className="zen-subpage__action-space" />
        </header>

        <div className="zen-subpage__body">
          <div className="zen-news-lead">
            <div className="zen-news-lead__badge">
              <Sparkles size={13} />
              <span>ZENOVA UPDATES</span>
            </div>
            <h2 className="zen-news-lead__title">История обновлений и улучшений</h2>
            <p className="zen-news-lead__desc">
              Мы постоянно улучшаем стабильность, скорость работы и добавляем новые возможности для комфортного кино-просмотра.
            </p>
          </div>

          <div className="zen-changelog-feed">
            {CHANGELOG.map((item) => (
              <article key={item.version} className="zen-release-card">
                <div className="zen-release-card__top">
                  <div className="zen-release-badge-wrap">
                    <span className="zen-release-ver">v{item.version}</span>
                    {item.badge && <span className="zen-release-tag-hot">{item.badge}</span>}
                  </div>
                  <span className="zen-release-date">{item.date}</span>
                </div>

                <h3 className="zen-release-headline">{item.headline}</h3>

                <div className="zen-change-items">
                  {item.changes.map((change, idx) => (
                    <div key={idx} className="zen-change-row">
                      <span className={`zen-change-pill zen-change-pill--${change.type}`}>
                        {change.type === 'fixed' && <CheckCircle2 size={12} />}
                        {change.type === 'new' && <Sparkles size={12} />}
                        {change.type === 'improved' && <Wrench size={12} />}
                        <span>
                          {change.type === 'fixed' ? 'Исправлено' : change.type === 'new' ? 'Новинка' : 'Улучшено'}
                        </span>
                      </span>
                      <div className="zen-change-body">
                        <strong className="zen-change-title">{change.title}</strong>
                        <p className="zen-change-desc">{change.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════ ГЛАВНЫЙ ЭКРАН ПРОФИЛЯ (Obsidian Dock Layout) ══════════════ */
  return (
    <div className="zen-profile-page page">
      {/* Шапка профиля */}
      <header className="zen-header">
        <div className="zen-header__left">
          <h1 className="zen-header__title">Настройки</h1>
          <span className="zen-header__subtitle">Аккаунт, библиотека и персонализация</span>
        </div>
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

      {/* Карточка пользователя с рангом и быстрой статистикой */}
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
            <div className="zen-user-kicker-row">
              <span className="zen-user-kicker">РЕЗИДЕНТ ZENOVA</span>
              <span className="zen-user-rank-chip">{rankTitle}</span>
            </div>
            <h2 className="zen-user-name">{displayName}</h2>
            <div className="zen-user-meta" onClick={handleCopyHandle}>
              <span className="zen-user-handle">{username}</span>
              <button type="button" className="zen-copy-btn" aria-label="Скопировать">
                <Copy size={11} />
                <span>{copiedId ? 'Скопировано!' : 'Копировать'}</span>
              </button>
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

        {/* Быстрая статистика пользователя */}
        <div className="zen-user-stats-strip">
          <div className="zen-user-stat-chip">
            <span className="zen-user-stat-val text-green">{watchedCount}</span>
            <span className="zen-user-stat-lbl">Просмотрено</span>
          </div>
          <div className="zen-user-stat-div" />
          <div className="zen-user-stat-chip">
            <span className="zen-user-stat-val text-cyan">{wantCount}</span>
            <span className="zen-user-stat-lbl">В планах</span>
          </div>
          <div className="zen-user-stat-div" />
          <div className="zen-user-stat-chip">
            <span className="zen-user-stat-val text-gold">{favorites.length}</span>
            <span className="zen-user-stat-lbl">Избранное</span>
          </div>
          <div className="zen-user-stat-div" />
          <div className="zen-user-stat-chip">
            <span className="zen-user-stat-val">{totalXp}</span>
            <span className="zen-user-stat-lbl">Опыт XP</span>
          </div>
        </div>
      </div>

      {/* ── ГРУППА 1: НОВОВВЕДЕНИЯ & ИСПРАВЛЕНИЯ ── */}
      <div className="zen-section-header">НОВОВВЕДЕНИЯ & ИСПРАВЛЕНИЯ</div>
      <div className="zen-group">
        <div
          className="zen-row clickable zen-row--highlight"
          onClick={() => {
            haptic('light');
            setSubPage('news');
          }}
        >
          <span className="zen-row__icon-wrap zen-glow-purple">
            <Sparkles size={18} />
          </span>
          <div className="zen-row__info">
            <div className="zen-row__title-row">
              <span className="zen-row__title">Что нового в ZENOVA</span>
              <span className="zen-news-pill">v3.3.2 NEW</span>
            </div>
            <div className="zen-row__sub">Единая Кинотека, супер ZENOVA PRO, фикс экрана</div>
          </div>
          <ChevronRight size={16} className="zen-chevron" />
        </div>
      </div>

      {/* ── ГРУППА 2: ЕДИНАЯ КИНОТЕКА (ВМЕСТО 3 РАЗРОЗНЕННЫХ ПУНКТОВ) ── */}
      <div className="zen-section-header">МОЯ КИНОТЕКА</div>
      <div className="zen-group">
        <div
          className="zen-row clickable"
          onClick={() => {
            haptic('light');
            setSubPage('library');
          }}
        >
          <span className="zen-row__icon-wrap zen-glow-gold">
            <BookOpen size={18} />
          </span>
          <div className="zen-row__info">
            <div className="zen-row__title-row">
              <span className="zen-row__title">Моя Кинотека & Дневник</span>
              <span className="zen-counter-badge">{totalSavedCount} тайтлов</span>
            </div>
            <div className="zen-row__sub">Избранное, история, отметки и оценки в одном месте</div>
          </div>
          <ChevronRight size={16} className="zen-chevron" />
        </div>
      </div>

      {/* ── ГРУППА 3: ПРИВИЛЕГИИ ── */}
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
            <div className="zen-row__sub">4K HDR, Dolby Atmos, без рекламы, x2 XP</div>
          </div>
          <span className={`zen-row__val ${effectivePremium ? 'text-green' : 'text-gold'}`}>
            {effectivePremium ? (proDaysLeft ? `${proDaysLeft} дн.` : 'Активен') : 'Подключить'}
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
            <div className="zen-row__sub">Опыт киномана и разблокировка уровней</div>
          </div>
          <span className="zen-row__val">{rankTitle}</span>
          <ChevronRight size={16} className="zen-chevron" />
        </div>
      </div>

      {/* ── ГРУППА 4: АТМОСФЕРА И ТЕМЫ ── */}
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
            <div className="zen-row__sub">Северное сияние, эффекты и выбор палитры</div>
          </div>
          <span className="zen-row__val">{auroraOff ? 'Сияние выкл' : 'Активно'}</span>
          <ChevronRight size={16} className="zen-chevron" />
        </div>
      </div>

      {/* ── ГРУППА 5: ИНФОРМАЦИЯ & ВЫХОД ── */}
      <div className="zen-section-header">ПРИЛОЖЕНИЕ</div>
      <div className="zen-group">
        <div
          className="zen-row clickable"
          onClick={() => {
            haptic('light');
            setSubPage('rules');
          }}
        >
          <span className="zen-row__icon-wrap">
            <ShieldCheck size={18} />
          </span>
          <div className="zen-row__info">
            <div className="zen-row__title">Правила и соглашение</div>
            <div className="zen-row__sub">Пользовательские условия и безопасность</div>
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
    </div>
  );
};

export default ProfilePage;
