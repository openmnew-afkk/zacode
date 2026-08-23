/* ===== TeleCinema — Store с премиум и админкой ===== */

import { create } from 'zustand';
import type { Movie, WatchHistoryItem, AppTheme } from '../types';

/* ── localStorage helpers ── */
const load = <T>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
};

const save = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

/* Хеш пароля (SHA-256) */
async function hashPassword(pass: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pass + '_telecinema_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ── Admin username ── */
const ADMIN_USERNAMES = ['MikySauce'];

/* ── Премиум: срок действия ── */
const PREMIUM_EXPIRY_KEY = 'tc_premium_expiry';

/** Премиум активен = флаг стоит И (нет срока ИЛИ срок не истёк) */
function computePremium(flag: boolean): { isPremium: boolean; expiry: number | null } {
  let expiry: number | null = null;
  try {
    const raw = localStorage.getItem(PREMIUM_EXPIRY_KEY);
    if (raw) expiry = Number(raw);
  } catch {}
  if (!flag) return { isPremium: false, expiry };
  if (expiry && Date.now() > expiry) {
    // Истёк — снимаем
    try { localStorage.removeItem('tc_premium'); } catch {}
    return { isPremium: false, expiry };
  }
  return { isPremium: true, expiry };
}

interface AppState {
  /* Избранное */
  favorites: Movie[];
  addFavorite: (movie: Movie) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clearFavorites: () => void;

  /* История */
  watchHistory: WatchHistoryItem[];
  addToHistory: (movie: Movie) => void;
  clearHistory: () => void;

  /* Тема */
  theme: AppTheme;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;

  /* Премиум */
  isPremium: boolean;
  /** Срок окончания премиума (timestamp) или null = бессрочно */
  premiumExpiry: number | null;
  setPremium: (val: boolean) => void;
  /** Активировать премиум на N дней (рулетка/промо) */
  activatePremiumDays: (days: number) => void;
  /** Активировать бессрочный премиум (админ/оплата) */
  activatePremiumForever: () => void;

  /* Админ */
  isAdmin: boolean;
  adminLogin: (password: string) => Promise<boolean>;
  adminLogout: () => void;

  /* Telegram */
  telegramUsername: string;
  setTelegramUsername: (u: string) => void;

  /* Реклама */
  adsEnabled: boolean;
  setAdsEnabled: (val: boolean) => void;

  /* Объявления */
  announcement: string;
  setAnnouncement: (text: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  /* ═══ Избранное ═══ */
  favorites: load<Movie[]>('tc_favorites', []),
  addFavorite: (movie: Movie) => {
    const updated = [...get().favorites, movie];
    save('tc_favorites', updated);
    set({ favorites: updated });
  },
  removeFavorite: (id: string) => {
    const updated = get().favorites.filter((m) => m.id !== id);
    save('tc_favorites', updated);
    set({ favorites: updated });
  },
  isFavorite: (id: string) => get().favorites.some((m) => m.id === id),
  clearFavorites: () => { save('tc_favorites', []); set({ favorites: [] }); },

  /* ═══ История ═══ */
  watchHistory: load<WatchHistoryItem[]>('tc_history', []),
  addToHistory: (movie: Movie) => {
    const filtered = get().watchHistory.filter((h) => h.movie.id !== movie.id);
    const updated = [{ movie, watchedAt: Date.now() }, ...filtered].slice(0, 50);
    save('tc_history', updated);
    set({ watchHistory: updated });
  },
  clearHistory: () => { save('tc_history', []); set({ watchHistory: [] }); },

  /* ═══ Тема ═══ */
  theme: load<AppTheme>('tc_theme', 'dark'),
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    save('tc_theme', newTheme);
    set({ theme: newTheme });
    document.documentElement.setAttribute('data-theme', newTheme);
  },
  setTheme: (theme: AppTheme) => {
    save('tc_theme', theme);
    set({ theme });
    document.documentElement.setAttribute('data-theme', theme);
  },

  /* ═══ Премиум ═══ */
  ...(() => {
    const state = computePremium(load<boolean>('tc_premium', false));
    return { isPremium: state.isPremium, premiumExpiry: state.expiry };
  })(),
  setPremium: (val: boolean) => {
    save('tc_premium', val);
    if (!val) {
      try { localStorage.removeItem(PREMIUM_EXPIRY_KEY); } catch {}
      set({ isPremium: false, premiumExpiry: null });
    } else {
      set({ isPremium: true });
    }
  },
  activatePremiumDays: (days: number) => {
    // Если премиум уже активен — продлеваем от текущего срока
    const current = get().premiumExpiry;
    const base = current && current > Date.now() ? current : Date.now();
    const expiry = base + days * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(PREMIUM_EXPIRY_KEY, String(expiry));
      localStorage.setItem('tc_premium', 'true');
    } catch {}
    set({ isPremium: true, premiumExpiry: expiry });
  },
  activatePremiumForever: () => {
    try {
      localStorage.setItem('tc_premium', 'true');
      localStorage.removeItem(PREMIUM_EXPIRY_KEY);
    } catch {}
    set({ isPremium: true, premiumExpiry: null });
  },

  /* ═══ Админ ═══ */
  isAdmin: load<boolean>('tc_admin', false),
  adminLogin: async (password: string) => {
    const hash = await hashPassword(password);
    const correctHash = await hashPassword('Kodik987412365');
    const username = get().telegramUsername;
    const isAdminUser = ADMIN_USERNAMES.includes(username);

    if (hash === correctHash) {
      save('tc_admin', true);
      set({ isAdmin: true });
      // Админ @MikySauce всегда премиум
      if (isAdminUser) {
        get().activatePremiumForever();
      }
      return true;
    }
    return false;
  },
  adminLogout: () => { save('tc_admin', false); set({ isAdmin: false }); },

  /* ═══ Telegram ═══ */
  telegramUsername: load<string>('tc_username', ''),
  setTelegramUsername: (u: string) => {
    save('tc_username', u);
    set({ telegramUsername: u });
    // Автоматически давать премиум админу
    if (ADMIN_USERNAMES.includes(u)) {
      get().activatePremiumForever();
    }
  },

  /* ═══ Реклама ═══ */
  adsEnabled: load<boolean>('tc_ads', true),
  setAdsEnabled: (val: boolean) => { save('tc_ads', val); set({ adsEnabled: val }); },

  /* ═══ Объявления ═══ */
  announcement: load<string>('tc_announcement', ''),
  setAnnouncement: (text: string) => { save('tc_announcement', text); set({ announcement: text }); },
}));