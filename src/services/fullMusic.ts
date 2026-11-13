/* ═══════════════════════════════════════════════════════════════════════════
 *  🎵 ZENOVA FULL MUSIC — полные треки вместо 30-секундных превью
 *
 *  iTunes даёт только метаданные альбома и короткие превью. Чтобы трек
 *  игрался ЦЕЛИКОМ, мы находим полноценный аудиопоток в открытых источниках:
 *    1. Internet Archive — полные саундтреки и альбомы (MP3 / M4A / OGG, CORS *).
 *    2. Audius — децентрализованный каталог полных треков от самих артистов.
 *
 *  Оба API публичные, без ключей и с открытым CORS, поэтому поток можно
 *  отдать напрямую в HTML5 Audio без iframe, рекламы и сторонних плееров.
 * ═══════════════════════════════════════════════════════════════════════════ */

import type { Track } from '../store/musicStore';
import { searchAudius } from './audius';

export interface FullAudio {
  streamUrl: string;
  duration: number;
  source: 'archive' | 'audius';
}

const AUDIO_EXT = /\.(mp3|m4a|ogg|oga)$/i;
const IA = 'https://archive.org';

/* ── Нормализация названий для сопоставления треков ── */
export const normTitle = (s: string): string =>
  (s || '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[^a-z0-9а-яё]+/gi, ' ')
    .replace(
      /\b(remaster(ed)?|version|edit|mono|stereo|bonus|track|ost|soundtrack|original|motion|picture|score|feat|ft|theme|from|the)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

async function fetchJson(url: string, timeoutMs = 8000): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/* «3:56» → 236; «319.8» → 319.8 */
function parseLength(v?: string): number {
  if (!v) return 0;
  if (v.includes(':')) {
    return v.split(':').map(Number).reduce((acc, p) => acc * 60 + (isFinite(p) ? p : 0), 0);
  }
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}

interface IaFile {
  name: string;
  length?: string;
  title?: string;
}

interface IaAudioFile {
  name: string;
  seconds: number;
  identifier: string;
}

const cleanQuery = (q: string) => q.replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g, ' ').replace(/\s+/g, ' ').trim();

/** Поиск аудио-альбомов (items) в Internet Archive по произвольному запросу */
async function searchArchiveItems(query: string, rows = 5): Promise<string[]> {
  const q = cleanQuery(query);
  if (!q) return [];
  const lucene = `mediatype:(audio) AND format:(MP3 OR "MPEG-4 Audio" OR Ogg) AND (title:(${q}) OR creator:(${q}))`;
  const url =
    `${IA}/advancedsearch.php?q=${encodeURIComponent(lucene)}` +
    `&fl%5B%5D=identifier&rows=${rows}&page=1&output=json`;
  const data = await fetchJson(url);
  const docs: Array<{ identifier?: string }> = Array.isArray(data?.response?.docs) ? data.response.docs : [];
  return docs.map((d) => d.identifier).filter(Boolean) as string[];
}

/** Аудиофайлы одного item (только полные треки длиннее 35 секунд) */
async function getArchiveAudioFiles(identifier: string): Promise<IaAudioFile[]> {
  const meta = await fetchJson(`${IA}/metadata/${identifier}`);
  if (!meta || !Array.isArray(meta.files)) return [];
  return (meta.files as IaFile[])
    .filter((f) => AUDIO_EXT.test(f.name || '') && parseLength(f.length) > 35)
    .map((f) => ({ name: f.name, seconds: Math.round(parseLength(f.length)), identifier }));
}

const streamUrlFor = (f: IaAudioFile) =>
  `${IA}/download/${f.identifier}/${encodeURIComponent(f.name)}`;

/** Сопоставление названия трека с файлами архива; возвращает лучший файл */
function matchFile(track: Track, files: IaAudioFile[]): IaAudioFile | null {
  const nt = normTitle(track.title);
  if (nt.length < 3) return null;
  let best: IaAudioFile | null = null;
  let bestScore = -1;
  for (const f of files) {
    const nf = normTitle(f.name.replace(AUDIO_EXT, ''));
    let score = 0;
    if (nf.includes(nt)) score = 10 + nt.length;
    else if (nt.includes(nf) && nf.length >= 4) score = 6 + nf.length;
    else continue;
    if (track.duration > 0 && f.seconds > 0) {
      const ratio = f.seconds / track.duration;
      if (ratio > 0.8 && ratio < 1.2) score += 5;
    }
    if (/\.mp3$/i.test(f.name)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }
  return best;
}

/* ── Кэш сопоставленных альбомов (на сессию) ── */
const albumCache = new Map<number, Map<string, FullAudio>>();

/**
 * Находит полные версии треков альбома в Internet Archive.
 * Возвращает Map<trackId, FullAudio> только для треков, которым нашлась пара.
 */
export async function findFullAlbumTracks(
  tracks: Track[],
  albumName: string,
  movieTitle?: string
): Promise<Map<string, FullAudio>> {
  const result = new Map<string, FullAudio>();
  if (!tracks.length) return result;

  const queries = [
    movieTitle ? `${movieTitle} soundtrack` : '',
    albumName,
  ].filter(Boolean);

  const idSets = await Promise.all(queries.map((q) => searchArchiveItems(q, 4)));
  const identifiers = Array.from(new Set(idSets.flat())).slice(0, 6);
  if (!identifiers.length) return result;

  const fileGroups = await Promise.all(identifiers.map((id) => getArchiveAudioFiles(id)));
  const files = fileGroups.flat();
  if (!files.length) return result;

  for (const track of tracks) {
    const match = matchFile(track, files);
    if (match) {
      result.set(track.id, {
        streamUrl: streamUrlFor(match),
        duration: match.seconds || track.duration,
        source: 'archive',
      });
    }
  }
  return result;
}

/** Кэшированная версия для повторного открытия альбома */
export async function findFullAlbumTracksCached(
  collectionId: number,
  tracks: Track[],
  albumName: string,
  movieTitle?: string
): Promise<Map<string, FullAudio>> {
  const hit = albumCache.get(collectionId);
  if (hit) return hit;
  const map = await findFullAlbumTracks(tracks, albumName, movieTitle);
  albumCache.set(collectionId, map);
  return map;
}

/**
 * Резолв ОДНОГО трека в полный формат (для ленивого до-поиска при старте
 * воспроизведения, если альбом не дал совпадения). Сначала Internet Archive,
 * затем Audius. Если ничего не нашлось — возвращает исходный трек (превью).
 */
export async function resolveFullTrack(track: Track): Promise<Track> {
  if (!track || track.source === 'archive' || track.source === 'audius' || track.isLiveRadio) {
    return track;
  }

  // 1. Internet Archive — полные саундтреки / альбомы
  try {
    const q = `${track.title} ${track.artist}`.trim();
    const ids = await searchArchiveItems(q, 3);
    for (const id of ids) {
      const files = await getArchiveAudioFiles(id);
      const match = matchFile(track, files);
      if (match) {
        return {
          ...track,
          streamUrl: streamUrlFor(match),
          duration: match.seconds || track.duration,
          source: 'archive',
        };
      }
    }
  } catch {
    /* переходим к Audius */
  }

  // 2. Audius — полные треки от артистов
  try {
    const cleanTitle = (track.title || '').replace(/[()[\]\-–—]/g, ' ').trim();
    const cleanArtist = (track.artist || '').replace(/[()[\]\-–—]/g, ' ').trim();
    const list = await searchAudius(`${cleanTitle} ${cleanArtist}`.trim(), 4);
    const normT = normTitle(track.title);
    const match =
      list.find((t) => {
        const tn = normTitle(t.title);
        return tn.includes(normT) || normT.includes(tn);
      }) || list[0];
    if (match && match.streamUrl && match.duration > 35) {
      return { ...track, streamUrl: match.streamUrl, duration: match.duration, source: 'audius' };
    }
  } catch {
    /* остаётся превью */
  }

  return track;
}

/** Является ли трек полным (не превью и не радио) */
export const isFullTrack = (t: Track | null | undefined): boolean =>
  Boolean(t && (t.source === 'archive' || t.source === 'audius'));