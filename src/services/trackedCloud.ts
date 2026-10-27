import type { Movie, TrackedItem, WatchStatus } from '../types';

const TRACKED_KEY_PREFIX = 'zenova_tracked_';
const CLOUD_BATCH_SIZE = 50;

type CloudCallback<T> = (error: string | null, value: T) => void;

interface TelegramCloudStorage {
  getKeys?: (callback: CloudCallback<string[]>) => void;
  getItems?: (keys: string[], callback: CloudCallback<Record<string, string>>) => void;
  setItem?: (key: string, value: string, callback: CloudCallback<boolean>) => void;
}

interface TelegramWindow {
  Telegram?: {
    WebApp?: {
      version?: string;
      CloudStorage?: TelegramCloudStorage;
    };
  };
}

export type TrackedCloudRecord =
  | { kind: 'item'; item: TrackedItem }
  | { kind: 'deleted'; deletedAt: number };

const cloudStorage = (): TelegramCloudStorage | null => {
  if (typeof window === 'undefined') return null;
  const webApp = (window as TelegramWindow).Telegram?.WebApp;
  const version = webApp?.version?.split('.').map((part) => Number.parseInt(part, 10));
  if (!webApp?.CloudStorage || !version || version[0] < 6 || (version[0] === 6 && (version[1] ?? 0) < 9)) {
    return null;
  }
  return webApp.CloudStorage;
};

const callCloud = <T>(run: (callback: CloudCallback<T>) => void): Promise<T> =>
  new Promise((resolve, reject) => {
    run((error, value) => {
      if (error) reject(new Error(error));
      else resolve(value);
    });
  });

const isWatchStatus = (value: unknown): value is WatchStatus =>
  value === 'want' || value === 'watching' || value === 'watched' || value === 'dropped';

function isTrackedItem(value: unknown): value is TrackedItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<TrackedItem>;
  return Boolean(
    item.movie &&
    typeof item.movie.id === 'string' &&
    typeof item.movie.title === 'string' &&
    isWatchStatus(item.status)
  );
}

function compactMovie(movie: Movie): Movie {
  return {
    id: movie.id,
    imdbID: movie.imdbID,
    title: movie.title.slice(0, 180),
    original_title: movie.original_title.slice(0, 180),
    overview: movie.overview.slice(0, 700),
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    release_date: movie.release_date,
    vote_average: movie.vote_average,
    imdb_rating: movie.imdb_rating,
    runtime: movie.runtime,
    type: movie.type,
    genre_ids: movie.genre_ids.slice(0, 12),
    genres: movie.genres.slice(0, 8),
    is_serial: movie.is_serial,
    directors: movie.directors.slice(0, 4),
    actors: movie.actors.slice(0, 6),
    countries: movie.countries.slice(0, 4),
    popularity: movie.popularity,
    adult: movie.adult,
    quality: movie.quality,
    kinopoisk_id: movie.kinopoisk_id,
  };
}

function trackedKey(id: string): string {
  return `${TRACKED_KEY_PREFIX}${encodeURIComponent(id)}`;
}

export async function readTrackedCloud(): Promise<Record<string, TrackedCloudRecord> | null> {
  const storage = cloudStorage();
  if (!storage?.getKeys || !storage.getItems) return null;

  const keys = await callCloud<string[]>((callback) => storage.getKeys?.(callback));
  const trackedKeys = keys.filter((key) => key.startsWith(TRACKED_KEY_PREFIX));
  const items: Record<string, TrackedCloudRecord> = {};

  for (let index = 0; index < trackedKeys.length; index += CLOUD_BATCH_SIZE) {
    const batch = trackedKeys.slice(index, index + CLOUD_BATCH_SIZE);
    const values = await callCloud<Record<string, string>>((callback) => storage.getItems?.(batch, callback));
    for (const key of batch) {
      const raw = values[key];
      if (!raw) continue;
      try {
        const item: unknown = JSON.parse(raw);
        if (isTrackedItem(item) && trackedKey(item.movie.id) === key) {
          items[item.movie.id] = { kind: 'item', item };
        } else if (
          item &&
          typeof item === 'object' &&
          Number.isFinite((item as { deletedAt?: unknown }).deletedAt)
        ) {
          const id = decodeURIComponent(key.slice(TRACKED_KEY_PREFIX.length));
          if (!id || trackedKey(id) !== key) throw new Error('Invalid tracked deletion key');
          items[id] = { kind: 'deleted', deletedAt: (item as { deletedAt: number }).deletedAt };
        } else {
          console.warn('Skipping invalid tracked item from Telegram CloudStorage:', key);
        }
      } catch (error) {
        console.warn('Could not parse tracked item from Telegram CloudStorage:', key, error);
      }
    }
  }

  return items;
}

export async function writeTrackedCloud(id: string, record: TrackedCloudRecord): Promise<void> {
  const storage = cloudStorage();
  if (!storage) return;

  const key = trackedKey(id);
  if (!storage.setItem) return;
  const value = record.kind === 'item'
    ? { ...record.item, movie: compactMovie(record.item.movie) }
    : { deletedAt: record.deletedAt };
  await callCloud((callback) => storage.setItem?.(key, JSON.stringify(value), callback));
}
