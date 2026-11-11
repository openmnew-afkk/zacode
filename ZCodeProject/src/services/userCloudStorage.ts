import type { Movie, TrackedItem, WatchHistoryItem, WatchStatus } from '../types';

/* ═══════════════════════════════════════════════════════════════════════════
   ZENOVA USER CLOUD STORAGE (100% БЕСПЛАТНОЕ И БЕЗОПАСНОЕ ХРАНИЛИЩЕ)
   
   Архитектура 3-уровневого надёжного сохранения данных киномана:
   1. Уровень 1: localStorage (мгновенно 0 мс)
   2. Уровень 2: IndexedDB (защита от сброса кэша Safari/iOS WebKit в Telegram)
   3. Уровень 3: Telegram.WebApp.CloudStorage (официальное бесплатное облако
      Telegram, привязанное к Telegram ID пользователя. Работает между всеми
      устройствами: iPhone, Android, ПК, без серверов и баз данных).
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 1. NATIVE INDEXEDDB HELPER ── */
function openIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('zenova_vault_v2', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('user_data')) {
          db.createObjectStore('user_data');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('user_data', 'readonly');
      const store = tx.objectStore('user_data');
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openIDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('user_data', 'readwrite');
      const store = tx.objectStore('user_data');
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/* ── 2. TELEGRAM CLOUDSTORAGE WRAPPER ── */
interface TelegramCloudStorage {
  getItem?: (key: string, cb: (err: string | null, val: string) => void) => void;
  getItems?: (keys: string[], cb: (err: string | null, vals: Record<string, string>) => void) => void;
  setItem?: (key: string, val: string, cb?: (err: string | null, ok: boolean) => void) => void;
  removeItem?: (key: string, cb?: (err: string | null, ok: boolean) => void) => void;
  getKeys?: (cb: (err: string | null, keys: string[]) => void) => void;
}

const getTgCloud = (): TelegramCloudStorage | null => {
  if (typeof window === 'undefined') return null;
  const tg = (window as any).Telegram?.WebApp;
  if (!tg?.CloudStorage) return null;
  return tg.CloudStorage;
};

const CHUNK_SIZE = 3600; // Telegram лимит 4096 байт на ключ

export async function tgCloudSaveChunked(prefix: string, data: unknown): Promise<boolean> {
  const cloud = getTgCloud();
  if (!cloud || !cloud.setItem) return false;

  try {
    const raw = JSON.stringify(data);
    const count = Math.ceil(raw.length / CHUNK_SIZE);

    // Мета-ключ
    const metaKey = `${prefix}_m`;
    const metaVal = JSON.stringify({ count, len: raw.length, ts: Date.now() });

    await new Promise<void>((resolve) => {
      cloud.setItem!(metaKey, metaVal, () => resolve());
    });

    for (let i = 0; i < count; i++) {
      const chunkKey = `${prefix}_${i}`;
      const chunkVal = raw.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await new Promise<void>((resolve) => {
        cloud.setItem!(chunkKey, chunkVal, () => resolve());
      });
    }

    return true;
  } catch (e) {
    console.warn(`[ZenovaCloud] Error saving ${prefix}:`, e);
    return false;
  }
}

export async function tgCloudLoadChunked<T>(prefix: string, fallback: T): Promise<T> {
  const cloud = getTgCloud();
  if (!cloud || !cloud.getItem || !cloud.getItems) return fallback;

  try {
    const metaKey = `${prefix}_m`;
    const metaRaw = await new Promise<string | null>((resolve) => {
      cloud.getItem!(metaKey, (err, val) => resolve(err || !val ? null : val));
    });

    if (!metaRaw) {
      // Пробуем прямой ключ без чанков (для обратной совместимости)
      const directRaw = await new Promise<string | null>((resolve) => {
        cloud.getItem!(prefix, (err, val) => resolve(err || !val ? null : val));
      });
      if (directRaw) {
        return JSON.parse(directRaw) as T;
      }
      return fallback;
    }

    const meta = JSON.parse(metaRaw);
    const count = Number(meta.count) || 1;
    const chunkKeys = Array.from({ length: count }, (_, i) => `${prefix}_${i}`);

    const chunks = await new Promise<Record<string, string>>((resolve) => {
      cloud.getItems!(chunkKeys, (err, vals) => resolve(err || !vals ? {} : vals));
    });

    let fullRaw = '';
    for (let i = 0; i < count; i++) {
      fullRaw += chunks[`${prefix}_${i}`] || '';
    }

    if (!fullRaw) return fallback;
    return JSON.parse(fullRaw) as T;
  } catch (e) {
    console.warn(`[ZenovaCloud] Error loading ${prefix}:`, e);
    return fallback;
  }
}

/* ── 3. COMPACT DATA ADAPTERS (Минимизация размера для быстроты облака) ── */
export function compactMovie(m: Movie): Movie {
  return {
    id: m.id,
    title: (m.title || '').slice(0, 120),
    original_title: (m.original_title || '').slice(0, 120),
    overview: (m.overview || '').slice(0, 280),
    poster_path: m.poster_path || '',
    backdrop_path: m.backdrop_path || '',
    release_date: m.release_date || '',
    vote_average: m.vote_average || 0,
    imdb_rating: m.imdb_rating,
    runtime: m.runtime,
    type: m.type,
    genre_ids: (m.genre_ids || []).slice(0, 5),
    genres: (m.genres || []).slice(0, 4),
    is_serial: Boolean(m.is_serial),
    directors: (m.directors || []).slice(0, 2),
    actors: (m.actors || []).slice(0, 4),
    countries: (m.countries || []).slice(0, 2),
    popularity: m.popularity,
    adult: m.adult,
    quality: m.quality,
    kinopoisk_id: m.kinopoisk_id,
    imdbID: m.imdbID,
  };
}

export function compactTrackedMap(tracked: Record<string, TrackedItem>): Record<string, TrackedItem> {
  const result: Record<string, TrackedItem> = {};
  for (const [id, item] of Object.entries(tracked)) {
    if (!item?.movie?.id || !item?.status) continue;
    result[id] = {
      movie: compactMovie(item.movie),
      status: item.status,
      rating: item.rating ?? null,
      addedAt: item.addedAt || Date.now(),
      updatedAt: item.updatedAt || Date.now(),
    };
  }
  return result;
}

export function compactHistoryList(history: WatchHistoryItem[]): WatchHistoryItem[] {
  return (history || []).slice(0, 50).map((h) => ({
    movie: compactMovie(h.movie),
    watchedAt: h.watchedAt || Date.now(),
  }));
}

export function compactFavoritesList(favorites: Movie[]): Movie[] {
  return (favorites || []).slice(0, 80).map(compactMovie);
}
