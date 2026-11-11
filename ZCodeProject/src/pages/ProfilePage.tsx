import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Trophy,
  Crown,
  ChevronRight,
  ChevronLeft,
  Check,
  LogOut,
  Star,
  Tv,
  CheckCircle2,
  Wrench,
  Copy,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Gamepad2,
  Zap,
  Palette,
  Newspaper,
  LifeBuoy,
  Gift,
} from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import { resolveUserAccess } from '../services/accessControl';
import { getStoredSeason, setStoredSeason, applySeason, detectSeason } from '../services/seasons';
import type { SeasonId } from '../services/seasons';
import { triggerSeasonalBurst } from '../components/SeasonFx';
import type { Movie, WatchStatus } from '../types';
import './ProfilePage.css';

type SubPage = 'library' | 'rank' | 'atmosphere' | 'news' | 'arcade' | null;

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
    version: '3.4.0',
    date: '12 ноября 2026',
    badge: 'БОЛЬШОЕ ОБНОВЛЕНИЕ',
    headline: 'Чистые настройки, полная музыка и понятный ZENOVA PRO',
    changes: [
      {
        type: 'new',
        title: 'Музыка в полном формате',
        desc: 'Саундтреки теперь играются целиком: полные треки подтягиваются из Internet Archive и Audius, а не только 30-секундные превью.',
      },
      {
        type: 'improved',
        title: 'Новые настройки с понятными иконками',
        desc: 'Сгруппированные разделы, аккуратные цветные иконки и быстрый доступ к подписке, темам и поддержке.',
      },
      {
        type: 'improved',
        title: 'Понятный ZENOVA PRO',
        desc: 'Простая страница подписки: что входит, сравнение с бесплатным доступом и прозрачные тарифы без мелкого шрифта.',
      },
      {
        type: 'improved',
        title: 'Новые правила и соглашение',
        desc: 'Читаемые карточки разделов с навигацией и краткими выжимками — юридическая информация без стены текста.',
      },
      {
        type: 'fixed',
        title: 'Убраны лишние разделы',
        desc: 'Из настроек удалены экспериментальные ZENOVA Studio и Synthax AI — приложение стало чище и быстрее.',
      },
    ],
  },
  {
    version: '3.3.3',
    date: '11 ноября 2026',
    headline: 'iOS Liquid Obsidian Settings и Игровой Клуб',
    changes: [
      {
        type: 'new',
        title: 'Ультра-дизайн настроек в стиле Pinterest & iOS 18',
        desc: 'Полный переход на стеклянные инсет-группы, сочные градиентные Apple Squircle-иконки и филигранные разделители.',
      },
      {
        type: 'improved',
        title: 'Игровой Клуб Zenova Arcade 60 FPS',
        desc: 'Плавный мини-раннер на Canvas с физикой, бонусами, рекордами и призовыми 3 днями ZENOVA PRO за мастерство.',
      },
    ],
  },
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
  const [copiedId, setCopiedId] = useState(false);
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

  // ── ARCADE GAME CENTER (Zenova Star Runner) ──
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [arcadeState, setArcadeState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [arcadeScore, setArcadeScore] = useState(0);
  const [arcadeBest, setArcadeBest] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('zen_arcade_best') || 0);
    } catch {
      return 0;
    }
  });
  const [arcadeWonBonus, setArcadeWonBonus] = useState(false);

  // Игровой цикл Arcade 60 FPS
  useEffect(() => {
    if (subPage !== 'arcade') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let playerY = 180;
    let playerVy = 0;
    const gravity = 0.36;
    const jumpForce = -6.4;
    const playerRadius = 14;
    let score = 0;
    let pillars: Array<{ x: number; top: number; bottom: number; passed: boolean }> = [];
    let stars: Array<{ x: number; y: number; s: number; alpha: number }> = [];
    let frame = 0;

    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        s: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.7 + 0.3,
      });
    }

    const spawnPillar = () => {
      const gap = 110;
      const minTop = 40;
      const maxTop = canvas.height - gap - 60;
      const top = Math.floor(Math.random() * (maxTop - minTop) + minTop);
      pillars.push({
        x: canvas.width + 10,
        top,
        bottom: top + gap,
        passed: false,
      });
    };

    const doJump = () => {
      if (arcadeState === 'gameover') {
        playerY = 180;
        playerVy = jumpForce;
        pillars = [];
        score = 0;
        setArcadeScore(0);
        setArcadeState('playing');
        haptic('light');
        return;
      }
      if (arcadeState === 'idle') {
        setArcadeState('playing');
        playerVy = jumpForce;
        haptic('light');
        return;
      }
      playerVy = jumpForce;
      haptic('light');
    };

    const handlePointer = (e: Event) => {
      e.preventDefault();
      doJump();
    };

    canvas.addEventListener('mousedown', handlePointer);
    canvas.addEventListener('touchstart', handlePointer, { passive: false });

    const loop = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Фон: глубокий ночной космос
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0a0b12');
      grad.addColorStop(1, '#161324');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Звезды
      stars.forEach((st) => {
        st.x -= 0.5;
        if (st.x < 0) st.x = canvas.width;
        ctx.fillStyle = `rgba(255, 255, 255, ${st.alpha})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.s, 0, Math.PI * 2);
        ctx.fill();
      });

      if (arcadeState === 'playing') {
        playerVy += gravity;
        playerY += playerVy;

        if (frame % 85 === 0) spawnPillar();

        for (let i = pillars.length - 1; i >= 0; i--) {
          const p = pillars[i];
          p.x -= 2.2;

          const neonGrad = ctx.createLinearGradient(p.x, 0, p.x + 40, 0);
          neonGrad.addColorStop(0, '#6366f1');
          neonGrad.addColorStop(0.5, '#a855f7');
          neonGrad.addColorStop(1, '#ec4899');

          ctx.fillStyle = neonGrad;
          ctx.beginPath();
          ctx.roundRect(p.x, 0, 40, p.top, [0, 0, 8, 8]);
          ctx.fill();

          ctx.beginPath();
          ctx.roundRect(p.x, p.bottom, 40, canvas.height - p.bottom, [8, 8, 0, 0]);
          ctx.fill();

          if (!p.passed && p.x + 40 < 60) {
            p.passed = true;
            score += 1;
            setArcadeScore(score);
            haptic('light');

            if (score > arcadeBest) {
              setArcadeBest(score);
              try {
                localStorage.setItem('zen_arcade_best', String(score));
              } catch {}
            }

            if (score === 25 && !arcadeWonBonus) {
              setArcadeWonBonus(true);
              activatePremiumDays(3);
              triggerSeasonalBurst(40);
              haptic('heavy');
            }
          }

          const playerX = 60;
          if (playerX + playerRadius > p.x && playerX - playerRadius < p.x + 40) {
            if (playerY - playerRadius < p.top || playerY + playerRadius > p.bottom) {
              setArcadeState('gameover');
              haptic('heavy');
            }
          }

          if (p.x < -60) pillars.splice(i, 1);
        }

        if (playerY + playerRadius > canvas.height - 10 || playerY - playerRadius < 0) {
          setArcadeState('gameover');
          haptic('heavy');
        }
      }

      // Отрисовка игрока
      ctx.save();
      ctx.translate(60, playerY);
      const angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, playerVy * 0.08));
      ctx.rotate(angle);

      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, 0, playerRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(5, -3, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(6, -4, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.ellipse(-7, 2, 7, 4, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(score), canvas.width / 2, 45);

      if (arcadeState === 'idle') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
        ctx.fillText('ZENOVA STAR RUNNER', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText('Тапните, чтобы начать', canvas.width / 2, canvas.height / 2 + 15);
      } else if (arcadeState === 'gameover') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.fillText('РАУНД ОКОНЧЕН', canvas.width / 2, canvas.height / 2 - 35);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px system-ui, -apple-system, sans-serif';
        ctx.fillText(`Счёт: ${score}   Рекорд: ${arcadeBest}`, canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.fillText('Тапните для рестарта', canvas.width / 2, canvas.height / 2 + 35);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', handlePointer);
      canvas.removeEventListener('touchstart', handlePointer);
    };
  }, [subPage, arcadeState, arcadeBest, arcadeWonBonus]);

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

  /* ══════════════ ПОДСТРАНИЦА: ИГРОВОЙ КЛУБ ZENOVA ARCADE (60 FPS) ══════════════ */
  if (subPage === 'arcade') {
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
          <h1 className="zen-subpage__title">Игровой Клуб Zenova Arcade</h1>
          <div className="zen-subpage__action-space" />
        </header>

        <div className="zen-subpage__body zen-subpage__body--arcade">
          {/* Статистика очков */}
          <div className="zen-arcade-ribbon">
            <div className="zen-arcade-stat">
              <span className="zen-arcade-stat__lbl">СЧЁТ</span>
              <strong className="zen-arcade-stat__val text-cyan">{arcadeScore}</strong>
            </div>
            <div className="zen-arcade-stat">
              <span className="zen-arcade-stat__lbl">РЕКОРД</span>
              <strong className="zen-arcade-stat__val text-gold">{arcadeBest}</strong>
            </div>
            <div className="zen-arcade-stat zen-arcade-stat--target">
              <span className="zen-arcade-stat__lbl">ЦЕЛЬ</span>
              <strong className="zen-arcade-stat__val text-green">25 = PRO на 3 дня</strong>
            </div>
          </div>

          {/* Поздравление с победой */}
          {arcadeWonBonus && (
            <div className="zen-arcade-win-banner">
              <Crown size={20} className="text-gold" />
              <span>Вы набрали 25 очков! Подарок 3 дня ZENOVA PRO активирован!</span>
            </div>
          )}

          {/* Игровой Canvas */}
          <div className="zen-arcade-canvas-wrap">
            <canvas ref={canvasRef} width={340} height={380} className="zen-arcade-canvas" />
          </div>

          {/* Подсказка */}
          <div className="zen-arcade-hint">
            <p>Жмите на экран или кнопку ниже, чтобы перепрыгивать неоновые кино-башни.</p>
          </div>

          {/* Кнопка прыжка для мобильных */}
          <div className="zen-arcade-controls">
            <button
              type="button"
              className="zen-arcade-jump-btn"
              onClick={() => {
                const canvas = canvasRef.current;
                if (canvas) {
                  canvas.dispatchEvent(new Event('mousedown'));
                }
              }}
            >
              <Zap size={18} />
              <span>Прыжок / Тап</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════ ГЛАВНЫЙ ЭКРАН НАСТРОЕК (OBSIDIAN CONTROL CENTER) ══════════════ */
  return (
    <div className="zen-profile-page page">
      {/* Шапка */}
      <header className="zen-header">
        <div className="zen-header__left">
          <span className="zen-header__kicker">ZENOVA · ЦЕНТР УПРАВЛЕНИЯ</span>
          <h1 className="zen-header__title">Настройки</h1>
        </div>
        {isAdminUser && (
          <button
            type="button"
            className="zen-admin-btn"
            onClick={() => navigate('/admin')}
          >
            <Sliders size={12} />
            <span>Админка</span>
          </button>
        )}
      </header>

      {/* Карточка пользователя */}
      <div className="zen-user-card" onClick={() => setSubPage('rank')}>
        <div className="zen-user-card__beam" />
        <div className="zen-user-card__top">
          <div className="zen-user-avatar-wrap">
            <div className="zen-user-avatar">
              {user?.photo_url ? (
                <img src={user.photo_url} alt={displayName} className="zen-user-avatar__img" />
              ) : (
                <img
                  src={seasonState.season.id === 'winter' ? './zenova-mask-winter.png' : './zenova-mask-default.png'}
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

        <div className="zen-user-rank-bar">
          <div className="zen-user-rank-track">
            <div className="zen-user-rank-fill" style={{ width: `${levelProgress}%` }} />
          </div>
          <div className="zen-user-rank-labels">
            <span className="zen-user-rank-title">Ранг: {rankTitle}</span>
            <span className="zen-user-rank-pts">{totalXp % 140} / 140 XP</span>
          </div>
        </div>

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

      {/* Баннер подписки ZENOVA PRO */}
      <button
        type="button"
        className={`zen-pro-banner ${effectivePremium ? 'zen-pro-banner--active' : ''}`}
        onClick={() => { haptic('light'); navigate('/premium'); }}
      >
        <span className="zen-pro-banner__icon">
          <Crown size={22} />
        </span>
        <span className="zen-pro-banner__body">
          <span className="zen-pro-banner__title">
            {effectivePremium ? 'ZENOVA PRO активен' : 'ZENOVA PRO'}
          </span>
          <span className="zen-pro-banner__sub">
            {effectivePremium
              ? (proDaysLeft ? `Осталось ${proDaysLeft} дн. · все привилегии включены` : 'Бессрочный доступ · все привилегии включены')
              : '4K, все озвучки и музыка без ограничений · 2 дня бесплатно'}
          </span>
        </span>
        <span className="zen-pro-banner__cta">
          {effectivePremium ? 'Управлять' : 'Открыть'}
          <ChevronRight size={14} />
        </span>
      </button>

      {/* ── Группа: Мои разделы ── */}
      <section className="zen-set-group">
        <h2 className="zen-set-group__title">Мои разделы</h2>
        <div className="zen-set-card">
          <button type="button" className="zen-set-row" onClick={() => { haptic('light'); setSubPage('library'); }}>
            <span className="zen-set-row__icon zen-set-row__icon--emerald"><BookOpen size={19} /></span>
            <span className="zen-set-row__body">
              <span className="zen-set-row__title">Моя Кинотека</span>
              <span className="zen-set-row__sub">Избранное, история, дневник и оценки</span>
            </span>
            <span className="zen-set-row__value">{totalSavedCount}</span>
            <ChevronRight size={17} className="zen-set-row__chev" />
          </button>

          <button type="button" className="zen-set-row" onClick={() => { haptic('light'); setSubPage('rank'); }}>
            <span className="zen-set-row__icon zen-set-row__icon--amber"><Trophy size={19} /></span>
            <span className="zen-set-row__body">
              <span className="zen-set-row__title">Рейтинг и награды</span>
              <span className="zen-set-row__sub">Опыт киномана, уровни и привилегии</span>
            </span>
            <span className="zen-set-row__value">LVL {cineLevel}</span>
            <ChevronRight size={17} className="zen-set-row__chev" />
          </button>

          <button type="button" className="zen-set-row" onClick={() => { haptic('light'); setSubPage('arcade'); }}>
            <span className="zen-set-row__icon zen-set-row__icon--orange"><Gamepad2 size={19} /></span>
            <span className="zen-set-row__body">
              <span className="zen-set-row__title">Игровой Клуб</span>
              <span className="zen-set-row__sub">Мини-игра · набери 25 очков и получи 3 дня PRO</span>
            </span>
            <span className="zen-set-row__value">{arcadeBest > 0 ? `Рекорд ${arcadeBest}` : 'Играть'}</span>
            <ChevronRight size={17} className="zen-set-row__chev" />
          </button>
        </div>
      </section>

      {/* ── Группа: Оформление ── */}
      <section className="zen-set-group">
        <h2 className="zen-set-group__title">Оформление</h2>
        <div className="zen-set-card">
          <button type="button" className="zen-set-row" onClick={() => { haptic('light'); setSubPage('atmosphere'); }}>
            <span className="zen-set-row__icon zen-set-row__icon--cyan"><Palette size={19} /></span>
            <span className="zen-set-row__body">
              <span className="zen-set-row__title">Атмосфера и темы</span>
              <span className="zen-set-row__sub">Северное сияние, сезонные эффекты и палитры</span>
            </span>
            <span className="zen-set-row__value">{seasonState.auto ? 'Авто' : seasonState.season.label}</span>
            <ChevronRight size={17} className="zen-set-row__chev" />
          </button>

          <button type="button" className="zen-set-row" onClick={() => { haptic('light'); setSubPage('news'); }}>
            <span className="zen-set-row__icon zen-set-row__icon--violet"><Newspaper size={19} /></span>
            <span className="zen-set-row__body">
              <span className="zen-set-row__title">Что нового</span>
              <span className="zen-set-row__sub">История обновлений и улучшений</span>
            </span>
            <span className="zen-set-row__value zen-set-row__value--accent">v3.4.0</span>
            <ChevronRight size={17} className="zen-set-row__chev" />
          </button>
        </div>
      </section>

      {/* ── Группа: Поддержка и безопасность ── */}
      <section className="zen-set-group">
        <h2 className="zen-set-group__title">Поддержка и безопасность</h2>
        <div className="zen-set-card">
          <button type="button" className="zen-set-row" onClick={() => { haptic('light'); navigate('/rules'); }}>
            <span className="zen-set-row__icon zen-set-row__icon--slate"><ShieldCheck size={19} /></span>
            <span className="zen-set-row__body">
              <span className="zen-set-row__title">Правила и соглашение</span>
              <span className="zen-set-row__sub">Условия использования и конфиденциальность</span>
            </span>
            <ChevronRight size={17} className="zen-set-row__chev" />
          </button>

          <a
            className="zen-set-row"
            href="https://t.me/zenovafilm"
            target="_blank"
            rel="noreferrer"
            onClick={() => haptic('light')}
          >
            <span className="zen-set-row__icon zen-set-row__icon--blue"><LifeBuoy size={19} /></span>
            <span className="zen-set-row__body">
              <span className="zen-set-row__title">Поддержка</span>
              <span className="zen-set-row__sub">Вопросы, идеи и обращения правообладателей</span>
            </span>
            <span className="zen-set-row__value">@zenovafilm</span>
            <ChevronRight size={17} className="zen-set-row__chev" />
          </a>

          {isAdminUser && (
            <button type="button" className="zen-set-row" onClick={() => { haptic('medium'); navigate('/admin'); }}>
              <span className="zen-set-row__icon zen-set-row__icon--indigo"><Sliders size={19} /></span>
              <span className="zen-set-row__body">
                <span className="zen-set-row__title">Панель администратора</span>
                <span className="zen-set-row__sub">Каталог, модерация и управление доступом</span>
              </span>
              <span className="zen-set-row__value zen-set-row__value--accent">Admin</span>
              <ChevronRight size={17} className="zen-set-row__chev" />
            </button>
          )}

          <button type="button" className="zen-set-row zen-set-row--danger" onClick={() => { haptic('medium'); closeApp(); }}>
            <span className="zen-set-row__icon zen-set-row__icon--red"><LogOut size={19} /></span>
            <span className="zen-set-row__body">
              <span className="zen-set-row__title">Закрыть ZENOVA</span>
              <span className="zen-set-row__sub">Завершить текущий сеанс в Telegram</span>
            </span>
            <ChevronRight size={17} className="zen-set-row__chev" />
          </button>
        </div>
      </section>

      {/* Подпись версии */}
      <footer className="zen-set-footer">
        <Gift size={13} />
        <span>ZENOVA v3.4.0 · кино, музыка и атмосфера в одном приложении</span>
      </footer>
    </div>
  );
};

export default ProfilePage;
