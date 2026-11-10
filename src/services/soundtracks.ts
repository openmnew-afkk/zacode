/* ═══════════════════════════════════════════════════════════════════════════
 *  ZENOVA SOUNDTRACKS — музыка из фильмов
 *  Источник: публичный iTunes Search API (бесплатно, без ключей, CORS открыт).
 *  Даёт официальный альбом саундтрека, обложку и 30-секундные превью треков.
 *
 *  «Услышано в кино» — когда пользователь начинает смотреть фильм, саундтрек
 *  этого фильма автоматически сохраняется в отдельный плейлист
 *  (localStorage + IndexedDB + Telegram CloudStorage).
 * ═══════════════════════════════════════════════════════════════════════════ */

import type { Movie } from '../types';
import type { Track } from '../store/musicStore';
import { idbGet, idbSet, tgCloudLoadChunked, tgCloudSaveChunked } from './userCloudStorage';
import { searchAudius } from './audius';

/** Кэш найденных полных треков Audius */
const fullTrackCache = new Map<string, { streamUrl: string; duration: number }>();

/**
 * 🎵 Поиск и воспроизведение ПОЛНОГО трека через Audius
 * Работает как прямой аудио-поток HTML5 Audio: без видео, без iframe,
 * без рекламы и без всплывающих окон мобильного YouTube!
 */
export async function resolveFullAudioTrack(track: Track): Promise<Track> {
  if (!track || track.source === 'audius' || track.isLiveRadio) {
    return track;
  }

  const cacheKey = `${track.title}__${track.artist}`.toLowerCase();
  if (fullTrackCache.has(cacheKey)) {
    const cached = fullTrackCache.get(cacheKey)!;
    return {
      ...track,
      streamUrl: cached.streamUrl,
      duration: cached.duration || track.duration,
      source: 'audius',
    };
  }

  try {
    // 1. Поиск по «Название Исполнитель»
    const cleanTitle = (track.title || '').replace(/[\(\)\[\]\-–—]/g, ' ').trim();
    const cleanArtist = (track.artist || '').replace(/[\(\)\[\]\-–—]/g, ' ').trim();
    const query = `${cleanTitle} ${cleanArtist}`.trim();

    const list = await searchAudius(query, 4);
    if (list && list.length > 0) {
      const normTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
      const match =
        list.find((t) => {
          const tNorm = (t.title || '').toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
          return tNorm.includes(normTitle) || normTitle.includes(tNorm);
        }) || list[0];

      if (match && match.streamUrl) {
        const fullDur = match.duration > 30 ? match.duration : track.duration;
        fullTrackCache.set(cacheKey, { streamUrl: match.streamUrl, duration: fullDur });
        return {
          ...track,
          streamUrl: match.streamUrl,
          duration: fullDur,
          source: 'audius',
        };
      }
    }
  } catch (err) {
    console.warn('Audius stream resolve fallback:', err);
  }

  return track;
}

export interface SoundtrackAlbum {
  collectionId: number;
  name: string;
  artist: string;
  artwork: string;
  trackCount: number;
  year: string;
  url: string;
}

export interface Soundtrack {
  album: SoundtrackAlbum;
  tracks: Track[];
}

/** Сохранённая запись плейлиста «Услышано в кино» (компактная — треки подгружаются по collectionId) */
export interface HeardEntry {
  movieId: string;
  title: string;
  originalTitle: string;
  poster: string;
  backdrop: string;
  year: string;
  collectionId: number;
  albumName: string;
  artist: string;
  artwork: string;
  savedAt: number;
}

const ITUNES = 'https://itunes.apple.com';
const CACHE_PREFIX = 'zenova_ost_v1_';
const HEARD_KEY = 'zenova_heard_in_cinema_v1';
const HEARD_CLOUD = 'znv_heard';
export const HEARD_EVENT = 'zenova-heard-change';

const bigArt = (url: string, size = 600) => (url || '').replace(/\/\d+x\d+bb\./, `/${size}x${size}bb.`);

const norm = (s: string) =>
  (s || '')
    .toLowerCase()
    .replace(/[«»"'’:!?.,()[\]\-–—&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function itunes<T>(path: string): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const res = await fetch(`${ITUNES}${path}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface ItunesAlbum {
  wrapperType: string;
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100: string;
  trackCount: number;
  releaseDate: string;
  primaryGenreName: string;
  collectionViewUrl: string;
}

interface ItunesSong {
  wrapperType: string;
  kind?: string;
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  trackNumber?: number;
  discNumber?: number;
}

const toAlbum = (a: ItunesAlbum): SoundtrackAlbum => ({
  collectionId: a.collectionId,
  name: a.collectionName,
  artist: a.artistName,
  artwork: bigArt(a.artworkUrl100),
  trackCount: a.trackCount,
  year: (a.releaseDate || '').slice(0, 4),
  url: a.collectionViewUrl,
});

/** Поиск лучшего альбома-саундтрека для фильма */
export async function findSoundtrackAlbum(movie: Pick<Movie, 'title' | 'original_title' | 'release_date'>): Promise<SoundtrackAlbum | null> {
  const original = movie.original_title || movie.title;
  const year = (movie.release_date || '').slice(0, 4);
  const cacheKey = `${CACHE_PREFIX}a_${norm(original)}_${year}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached === 'null' ? null : (JSON.parse(cached) as SoundtrackAlbum);
  } catch {}

  const target = norm(original);
  const queries = [`${original} soundtrack`, `${original} original score`, original];
  let best: { album: ItunesAlbum; score: number } | null = null;

  for (const q of queries) {
    const data = await itunes<{ results: ItunesAlbum[] }>(`/search?term=${encodeURIComponent(q)}&entity=album&limit=25`);
    for (const a of data?.results || []) {
      const name = norm(a.collectionName);
      const isOst =
        a.primaryGenreName === 'Soundtrack' ||
        /soundtrack|motion picture|original score|music from|series|саундтрек/i.test(a.collectionName);
      if (!isOst || !name.includes(target)) continue;
      let score = 10;
      if (a.primaryGenreName === 'Soundtrack') score += 4;
      if (/original motion picture soundtrack|original soundtrack/i.test(a.collectionName)) score += 3;
      if (year && (a.releaseDate || '').startsWith(year)) score += 5;
      if (/single|karaoke|tribute|cover|piano version|lullaby/i.test(a.collectionName)) score -= 8;
      score += Math.min(a.trackCount || 0, 30) / 6;
      if (!best || score > best.score) best = { album: a, score };
    }
    if (best && best.score >= 15) break;
  }

  const result = best ? toAlbum(best.album) : null;
  try { localStorage.setItem(cacheKey, result ? JSON.stringify(result) : 'null'); } catch {}
  return result;
}

/** Треки альбома (с 30-секундными официальными превью) */
export async function getAlbumTracks(album: SoundtrackAlbum, movieTitle?: string): Promise<Track[]> {
  const cacheKey = `${CACHE_PREFIX}t_${album.collectionId}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as Track[];
  } catch {}

  const data = await itunes<{ results: ItunesSong[] }>(`/lookup?id=${album.collectionId}&entity=song&limit=60`);
  const tracks: Track[] = (data?.results || [])
    .filter((s) => s.wrapperType === 'track' && s.previewUrl)
    .sort((a, b) => (a.discNumber || 1) - (b.discNumber || 1) || (a.trackNumber || 0) - (b.trackNumber || 0))
    .map((s) => ({
      id: `ost-${s.trackId}`,
      title: s.trackName,
      artist: s.artistName,
      artwork: bigArt(s.artworkUrl100 || album.artwork),
      // Реальная полная длительность трека из метаданных альбома (вместо 30 сек)
      duration: s.trackTimeMillis ? Math.round(s.trackTimeMillis / 1000) : 210,
      streamUrl: s.previewUrl as string,
      album: movieTitle ? `${movieTitle} · OST` : album.name,
      genre: 'Soundtrack',
      source: 'ZENOVA OST',
    }));

  try { sessionStorage.setItem(cacheKey, JSON.stringify(tracks)); } catch {}
  return tracks;
}

export async function getSoundtrack(movie: Pick<Movie, 'title' | 'original_title' | 'release_date'>): Promise<Soundtrack | null> {
  const album = await findSoundtrackAlbum(movie);
  if (!album) return null;
  const tracks = await getAlbumTracks(album, movie.title);
  if (!tracks.length) return null;
  return { album, tracks };
}

/* ═══════════ Плейлист «Услышано в кино» ═══════════ */

export function getHeardList(): HeardEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HEARD_KEY) || '[]') as HeardEntry[];
  } catch {
    return [];
  }
}

function persistHeard(list: HeardEntry[]) {
  const trimmed = list.slice(0, 40);
  try { localStorage.setItem(HEARD_KEY, JSON.stringify(trimmed)); } catch {}
  idbSet(HEARD_KEY, trimmed);
  tgCloudSaveChunked(HEARD_CLOUD, trimmed);
  window.dispatchEvent(new CustomEvent(HEARD_EVENT));
}

export function removeHeard(movieId: string) {
  persistHeard(getHeardList().filter((e) => e.movieId !== movieId));
}

/** Восстановление плейлиста после очистки памяти (IndexedDB → Telegram CloudStorage) */
export async function restoreHeardList(): Promise<HeardEntry[]> {
  let local = getHeardList();
  if (!local.length) {
    const fromIdb = await idbGet<HeardEntry[]>(HEARD_KEY);
    if (fromIdb?.length) local = fromIdb;
  }
  const cloud = await tgCloudLoadChunked<HeardEntry[]>(HEARD_CLOUD, []);
  const map = new Map<string, HeardEntry>();
  [...cloud, ...local].forEach((e) => {
    if (!e?.movieId) return;
    const prev = map.get(e.movieId);
    if (!prev || e.savedAt > prev.savedAt) map.set(e.movieId, e);
  });
  const merged = Array.from(map.values()).sort((a, b) => b.savedAt - a.savedAt);
  if (merged.length !== getHeardList().length) {
    try { localStorage.setItem(HEARD_KEY, JSON.stringify(merged)); } catch {}
    window.dispatchEvent(new CustomEvent(HEARD_EVENT));
  }
  return merged;
}

/**
 * Вызывается при старте просмотра фильма: находит саундтрек и
 * сохраняет его в «Услышано в кино». Работает тихо в фоне.
 */
export async function captureSoundtrackFromMovie(movie: Movie): Promise<HeardEntry | null> {
  try {
    const existing = getHeardList();
    const already = existing.find((e) => e.movieId === movie.id);
    if (already) {
      persistHeard([{ ...already, savedAt: Date.now() }, ...existing.filter((e) => e.movieId !== movie.id)]);
      return already;
    }
    const album = await findSoundtrackAlbum(movie);
    if (!album) return null;
    const entry: HeardEntry = {
      movieId: movie.id,
      title: movie.title,
      originalTitle: movie.original_title || movie.title,
      poster: movie.poster_path || '',
      backdrop: movie.backdrop_path || movie.poster_path || '',
      year: (movie.release_date || '').slice(0, 4),
      collectionId: album.collectionId,
      albumName: album.name,
      artist: album.artist,
      artwork: album.artwork,
      savedAt: Date.now(),
    };
    persistHeard([entry, ...getHeardList().filter((e) => e.movieId !== movie.id)]);
    return entry;
  } catch {
    return null;
  }
}

export const heardToAlbum = (e: HeardEntry): SoundtrackAlbum => ({
  collectionId: e.collectionId,
  name: e.albumName,
  artist: e.artist,
  artwork: e.artwork,
  trackCount: 0,
  year: e.year,
  url: '',
});
