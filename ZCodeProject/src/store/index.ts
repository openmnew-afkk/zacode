/* ===== TeleCinema — Store с премиум и админкой ===== */

import { create } from 'zustand';
import type { Movie, WatchHistoryItem, AppTheme, WatchStatus, TrackedItem } from '../types';
import type { BackendConfig, Requisites, Prices } from '../api/backend';
import { findLocalGrant } from '../api/backend';
import { resolveUserAccess, MASTER_ADMINS } from '../services/accessControl';
import { readTrackedCloud, writeTrackedCloud, type TrackedCloudRecord } from '../services/trackedCloud';
import {
  idbGet,
  idbSet,
  tgCloudSaveChunked,
  tgCloudLoadChunked,
  compactMovie,
  compactFavoritesList,
  compactHistoryList,
  compactTrackedMap,
} from '../services/userCloudStorage';
import {
  getLocalMandatorySub,
  saveLocalMandatorySub,
  isUserSubscribed,
  markUserSubscribed,
  resetUserSubscribed,
  type MandatorySubConfig,
  pullCloudData,
  getLocalBlockedMovies,
  saveLocalBlockedMovies,
  isMovieBlockedLocally,
} from '../services/cloudSync';

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
const ADMIN_USERNAMES = ['ZenovaAdmin', 'admin'];

/* ── Премиум: срок действия ── */
const PREMIUM_EXPIRY_KEY = 'tc_premium_expiry';

/** Премиум активен = флаг стоит И (нет срока ИЛИ срок не истёк) */
function computePremium(flag: boolean): { isPremium: boolean; expiry: number | null } {
  let expiry: number | null = null;
  try {
    const raw = localStorage.getItem(PREMIUM_EXPIRY_KEY);
    if (raw) expiry = Number(raw);
  } catch {}

  // Авто-проверка прав по @username
  const savedUser = load<string>('tc_username', '');
  if (savedUser) {
    const access = resolveUserAccess(savedUser);
    if (access.isVip) {
      return { isPremium: true, expiry: access.expiry };
    }
  }

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

  /* ═══ Дневник киномана: статусы и личные оценки ═══ */
  tracked: Record<string, TrackedItem>;
  trackedDeletions: Record<string, number>;
  /** Установить статус (повторный тап по тому же — снять) */
  setTrackedStatus: (movie: Movie, status: WatchStatus | null) => void;
  /** Личная оценка 1-10 */
  setPersonalRating: (id: string, rating: number) => void;
  getStatus: (id: string) => WatchStatus | null;
  getRating: (id: string) => number | null;
  syncTrackedCloud: () => Promise<void>;

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

  /* Обязательная подписка на Telegram-канал (ОП) */
  mandatorySub: MandatorySubConfig;
  setMandatorySub: (cfg: Partial<MandatorySubConfig>) => void;
  isChannelSubscribed: boolean;
  setChannelSubscribed: (val: boolean) => void;
  syncCloudState: () => Promise<void>;

  /* Стоп-лист по требованию правообладателей (Notice & Takedown) */
  blockedMovieIds: string[];
  addBlockedMovieId: (id: string) => void;
  removeBlockedMovieId: (id: string) => void;
  isMovieBlocked: (idOrKinopoisk: string | number) => boolean;

  /* ═══ Мини-бэкенд (центральный конфиг) ═══ */
  /** Реквизиты оплаты премиума (задаёт админ) */
  requisites: Requisites;
  /** Цены (задаёт админ) */
  prices: Prices;
  /** Список модераторов */
  moderators: string[];
  /** Роль пользователя: admin / moderator / null */
  role: 'admin' | 'moderator' | null;
  setRole: (role: 'admin' | 'moderator' | null) => void;
  /** Применить конфиг с сервера (реклама, объявления, реквизиты, премия) */
  applyBackendConfig: (cfg: BackendConfig, myName: string) => void;
  /** Применить локальные гранты (фолбэк, когда сервер недоступен) */
  applyLocalPremium: (myName: string) => void;
  /** Активировать премиум с сервера (без записи в localStorage) */
  applyRemotePremium: (expiry: number | null) => void;
}

const DEFAULT_REQUISITES: Requisites = { card: '', sbp: '', crypto: '', note: '' };
const DEFAULT_PRICES: Prices = { month: 199, monthFirst: 99, year: 2400, yearFirst: 1600 };
let trackedCloudWriteQueue = Promise.resolve();

function trackedRecordTimestamp(record: TrackedCloudRecord): number {
  return record.kind === 'item'
    ? record.item.updatedAt ?? record.item.addedAt
    : record.deletedAt;
}

function sameTrackedRecord(left: TrackedCloudRecord | undefined, right: TrackedCloudRecord): boolean {
  if (!left || left.kind !== right.kind) return false;
  if (left.kind === 'deleted' && right.kind === 'deleted') return left.deletedAt === right.deletedAt;
  if (left.kind === 'item' && right.kind === 'item') {
    return left.item.updatedAt === right.item.updatedAt
      && left.item.addedAt === right.item.addedAt
      && left.item.status === right.item.status
      && left.item.rating === right.item.rating;
  }
  return false;
}

function queueTrackedCloudWrite(id: string, record: TrackedCloudRecord): void {
  trackedCloudWriteQueue = trackedCloudWriteQueue
    .then(() => writeTrackedCloud(id, record))
    .catch((error: unknown) => {
      console.warn('Could not sync watch status to Telegram CloudStorage:', error);
    });
}

export const useStore = create<AppState>((set, get) => ({
  /* ═══ Избранное ═══ */
  favorites: load<Movie[]>('tc_favorites', []),
  addFavorite: (movie: Movie) => {
    const compact = compactMovie(movie);
    const updated = [compact, ...get().favorites.filter((m) => m.id !== compact.id)];
    save('tc_favorites', updated);
    idbSet('tc_favorites', updated);
    tgCloudSaveChunked('znv_favs', compactFavoritesList(updated));
    set({ favorites: updated });
  },
  removeFavorite: (id: string) => {
    const updated = get().favorites.filter((m) => m.id !== id);
    save('tc_favorites', updated);
    idbSet('tc_favorites', updated);
    tgCloudSaveChunked('znv_favs', compactFavoritesList(updated));
    set({ favorites: updated });
  },
  isFavorite: (id: string) => get().favorites.some((m) => m.id === id),
  clearFavorites: () => {
    save('tc_favorites', []);
    idbSet('tc_favorites', []);
    tgCloudSaveChunked('znv_favs', []);
    set({ favorites: [] });
  },

  /* ═══ История ═══ */
  watchHistory: load<WatchHistoryItem[]>('tc_history', []),
  addToHistory: (movie: Movie) => {
    const compact = compactMovie(movie);
    const filtered = get().watchHistory.filter((h) => h.movie.id !== compact.id);
    const updated = [{ movie: compact, watchedAt: Date.now() }, ...filtered].slice(0, 50);
    save('tc_history', updated);
    idbSet('tc_history', updated);
    tgCloudSaveChunked('znv_hist', compactHistoryList(updated));
    set({ watchHistory: updated });
  },
  clearHistory: () => {
    save('tc_history', []);
    idbSet('tc_history', []);
    tgCloudSaveChunked('znv_hist', []);
    set({ watchHistory: [] });
  },

  /* ═══ Дневник киномана ═══ */
  tracked: load<Record<string, TrackedItem>>('tc_tracked', {}),
  trackedDeletions: load<Record<string, number>>('tc_tracked_deleted', {}),
  setTrackedStatus: (movie, status) => {
    const t = { ...get().tracked };
    const deletions = { ...get().trackedDeletions };
    if (!status || t[movie.id]?.status === status) {
      delete t[movie.id];
      deletions[movie.id] = Date.now();
    } else {
      t[movie.id] = {
        movie: compactMovie(movie),
        status,
        rating: t[movie.id]?.rating ?? null,
        addedAt: t[movie.id]?.addedAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      delete deletions[movie.id];
    }
    save('tc_tracked', t);
    save('tc_tracked_deleted', deletions);
    idbSet('tc_tracked', t);
    tgCloudSaveChunked('znv_trck', compactTrackedMap(t));
    set({ tracked: t, trackedDeletions: deletions });
    const record = t[movie.id]
      ? { kind: 'item' as const, item: t[movie.id] }
      : { kind: 'deleted' as const, deletedAt: deletions[movie.id] };
    queueTrackedCloudWrite(movie.id, record);
  },
  setPersonalRating: (id, rating) => {
    const t = { ...get().tracked };
    if (!t[id]) return;
    t[id] = { ...t[id], rating, updatedAt: Date.now() };
    save('tc_tracked', t);
    idbSet('tc_tracked', t);
    tgCloudSaveChunked('znv_trck', compactTrackedMap(t));
    set({ tracked: t });
    queueTrackedCloudWrite(id, { kind: 'item', item: t[id] });
  },
  getStatus: (id) => get().tracked[id]?.status ?? null,
  getRating: (id) => get().tracked[id]?.rating ?? null,
  syncTrackedCloud: async () => {
    try {
      /* 1. Восстановление Избранного (Favorites) из Telegram CloudStorage + IndexedDB */
      let favs = get().favorites;
      if (favs.length === 0) {
        const idbFavs = await idbGet<Movie[]>('tc_favorites');
        if (idbFavs && idbFavs.length > 0) {
          favs = idbFavs;
          save('tc_favorites', favs);
          set({ favorites: favs });
        }
      }
      const cloudFavs = await tgCloudLoadChunked<Movie[]>('znv_favs', []);
      if (cloudFavs && cloudFavs.length > 0) {
        const map = new Map<string, Movie>();
        cloudFavs.forEach((m) => m?.id && map.set(m.id, m));
        favs.forEach((m) => m?.id && map.set(m.id, m));
        const mergedFavs = Array.from(map.values()).map(compactMovie);
        save('tc_favorites', mergedFavs);
        idbSet('tc_favorites', mergedFavs);
        set({ favorites: mergedFavs });
      }

      /* 2. Восстановление Истории (Watch History) */
      let hist = get().watchHistory;
      if (hist.length === 0) {
        const idbHist = await idbGet<WatchHistoryItem[]>('tc_history');
        if (idbHist && idbHist.length > 0) {
          hist = idbHist;
          save('tc_history', hist);
          set({ watchHistory: hist });
        }
      }
      const cloudHist = await tgCloudLoadChunked<WatchHistoryItem[]>('znv_hist', []);
      if (cloudHist && cloudHist.length > 0) {
        const map = new Map<string, WatchHistoryItem>();
        cloudHist.forEach((h) => h?.movie?.id && map.set(h.movie.id, h));
        hist.forEach((h) => {
          if (!h?.movie?.id) return;
          const prev = map.get(h.movie.id);
          if (!prev || (h.watchedAt || 0) > (prev.watchedAt || 0)) {
            map.set(h.movie.id, h);
          }
        });
        const mergedHist = Array.from(map.values())
          .sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))
          .slice(0, 50);
        save('tc_history', mergedHist);
        idbSet('tc_history', mergedHist);
        set({ watchHistory: mergedHist });
      }

      /* 3. Восстановление Дневника (Tracked & Ratings) */
      let trackedLocal = get().tracked;
      if (Object.keys(trackedLocal).length === 0) {
        const idbTracked = await idbGet<Record<string, TrackedItem>>('tc_tracked');
        if (idbTracked && Object.keys(idbTracked).length > 0) {
          trackedLocal = idbTracked;
          save('tc_tracked', trackedLocal);
          set({ tracked: trackedLocal });
        }
      }

      const cloudTracked = await tgCloudLoadChunked<Record<string, TrackedItem>>('znv_trck', {});
      const legacyRemote = await readTrackedCloud();

      const mergedTracked: Record<string, TrackedItem> = { ...trackedLocal };

      if (cloudTracked && typeof cloudTracked === 'object') {
        for (const [id, item] of Object.entries(cloudTracked)) {
          if (!item?.movie?.id) continue;
          const curr = mergedTracked[id];
          if (!curr || (item.updatedAt || 0) > (curr.updatedAt || 0)) {
            mergedTracked[id] = item;
          }
        }
      }

      if (legacyRemote) {
        for (const [id, rec] of Object.entries(legacyRemote)) {
          if (rec.kind === 'item' && rec.item?.movie?.id) {
            const curr = mergedTracked[id];
            if (!curr || (rec.item.updatedAt || 0) > (curr.updatedAt || 0)) {
              mergedTracked[id] = rec.item;
            }
          }
        }
      }

      save('tc_tracked', mergedTracked);
      idbSet('tc_tracked', mergedTracked);
      tgCloudSaveChunked('znv_trck', compactTrackedMap(mergedTracked));
      set({ tracked: mergedTracked });
    } catch (e) {
      console.warn('[ZenovaCloud] Error during syncUserDataCloud:', e);
    }
  },

  /* ═══ Тема ═══ */
  theme: (() => {
    try {
      save('tc_theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add('dark');
    } catch {}
    return 'dark' as AppTheme;
  })(),
  toggleTheme: () => {
    save('tc_theme', 'dark');
    set({ theme: 'dark' });
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  },
  setTheme: () => {
    save('tc_theme', 'dark');
    set({ theme: 'dark' });
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
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
  isAdmin: (() => {
    const u = load<string>('tc_username', '');
    const access = resolveUserAccess(u);
    return access.isAdmin || load<boolean>('tc_admin', false);
  })(),
  adminLogin: async (password: string) => {
    const username = get().telegramUsername;
    const access = resolveUserAccess(username);
    if (access.isAdmin) {
      save('tc_admin', true);
      set({ isAdmin: true, role: 'admin' });
      get().activatePremiumForever();
      return true;
    }

    const hash = await hashPassword(password);
    const correctHash = await hashPassword('Kodik987412365');

    if (hash === correctHash) {
      save('tc_admin', true);
      set({ isAdmin: true, role: 'admin' });
      get().activatePremiumForever();
      return true;
    }
    return false;
  },
  adminLogout: () => {
    save('tc_admin', false);
    set({ isAdmin: false, role: null });
  },

  /* ═══ Telegram ═══ */
  telegramUsername: load<string>('tc_username', ''),
  setTelegramUsername: (u: string) => {
    save('tc_username', u);
    set({ telegramUsername: u });
    const access = resolveUserAccess(u);
    if (access.isAdmin) {
      save('tc_admin', true);
      set({ isAdmin: true, role: 'admin' });
      get().activatePremiumForever();
    } else if (access.isModerator) {
      set({ role: 'moderator' });
      get().activatePremiumForever();
    } else if (access.isVip) {
      if (access.expiry) {
        const days = Math.ceil((access.expiry - Date.now()) / (24 * 60 * 60 * 1000));
        get().activatePremiumDays(Math.max(days, 1));
      } else {
        get().activatePremiumForever();
      }
    }
  },

  /* ═══ Реклама ═══ */
  adsEnabled: load<boolean>('tc_ads', true),
  setAdsEnabled: (val: boolean) => { save('tc_ads', val); set({ adsEnabled: val }); },

  /* ═══ Объявления ═══ */
  announcement: load<string>('tc_announcement', ''),
  setAnnouncement: (text: string) => { save('tc_announcement', text); set({ announcement: text }); },

  /* ═══ Обязательная подписка на канал (ОП) ═══ */
  mandatorySub: getLocalMandatorySub(),
  setMandatorySub: (cfg) => {
    const updated = { ...get().mandatorySub, ...cfg };
    saveLocalMandatorySub(updated);
    set({ mandatorySub: updated });
  },
  isChannelSubscribed: isUserSubscribed(),
  setChannelSubscribed: (val) => {
    if (val) markUserSubscribed(get().telegramUsername);
    else resetUserSubscribed();
    set({ isChannelSubscribed: val });
  },

  /* ═══ Стоп-лист по требованию правообладателей ═══ */
  blockedMovieIds: getLocalBlockedMovies(),
  addBlockedMovieId: (id: string) => {
    const clean = id.trim();
    if (!clean) return;
    const current = get().blockedMovieIds;
    if (current.includes(clean)) return;
    const updated = [...current, clean];
    saveLocalBlockedMovies(updated);
    set({ blockedMovieIds: updated });
  },
  removeBlockedMovieId: (id: string) => {
    const updated = get().blockedMovieIds.filter((x) => x !== id.trim());
    saveLocalBlockedMovies(updated);
    set({ blockedMovieIds: updated });
  },
  isMovieBlocked: (idOrKinopoisk: string | number) => {
    if (!idOrKinopoisk) return false;
    const str = String(idOrKinopoisk).toLowerCase().trim();
    return get().blockedMovieIds.some((x) => String(x).toLowerCase().trim() === str);
  },

  syncCloudState: async () => {
    try {
      const cloud = await pullCloudData();
      if (cloud) {
        if (cloud.mandatorySub) {
          saveLocalMandatorySub(cloud.mandatorySub);
          set({ mandatorySub: cloud.mandatorySub });
        }
        if (cloud.blockedMovieIds) {
          saveLocalBlockedMovies(cloud.blockedMovieIds);
          set({ blockedMovieIds: cloud.blockedMovieIds });
        }
        if (cloud.announcement !== undefined) {
          save('tc_announcement', cloud.announcement);
          set({ announcement: cloud.announcement });
        }
        if (cloud.adsEnabled !== undefined) {
          save('tc_ads', cloud.adsEnabled);
          set({ adsEnabled: cloud.adsEnabled });
        }
      }
    } catch {}
  },

  /* ═══ Мини-бэкенд (центральный конфиг) ═══ */
  requisites: { ...DEFAULT_REQUISITES },
  prices: { ...DEFAULT_PRICES },
  moderators: [],
  role: load<'admin' | 'moderator' | null>('tc_role', null),
  setRole: (role) => { save('tc_role', role); set({ role }); },
  applyRemotePremium: (expiry) => {
    // Премиум с сервера: только в state (не в localStorage) —
    // при следующем запуске конфиг подтянется заново
    if (expiry === null || expiry > Date.now()) {
      set({ isPremium: true, premiumExpiry: expiry });
    }
  },
  applyBackendConfig: (cfg, myName) => {
    const patch: Partial<AppState> = {
      adsEnabled: cfg.adsEnabled,
      announcement: cfg.announcement || load<string>('tc_announcement', ''),
      requisites: { ...DEFAULT_REQUISITES, ...(cfg.requisites || {}) },
      prices: { ...DEFAULT_PRICES, ...(cfg.prices || {}) },
      moderators: cfg.moderators || [],
    };
    set(patch as AppState);

    /* Мой премиум на сервере? (по username или имени) */
    const n = myName.trim().replace(/^@/, '').toLowerCase();
    if (n) {
      const grant = (cfg.premiumGrants || []).find(
        (g) => g.username?.toLowerCase() === n || g.name?.toLowerCase() === n
      );
      if (grant && (grant.forever || (grant.expiry && grant.expiry > Date.now()))) {
        get().applyRemotePremium(grant.forever ? null : grant.expiry);
      }
    }
  },

  /* ═══ Локальные гранты (админ выдал без сервера — работают на этом устройстве) ═══ */
  applyLocalPremium: (myName) => {
    try {
      const grant = findLocalGrant(myName);
      if (grant) get().applyRemotePremium(grant.forever ? null : grant.expiry);
    } catch {}
  },
}));