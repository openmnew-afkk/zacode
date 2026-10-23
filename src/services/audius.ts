/* ═══════════════════════════════════════════════════════════════════════════
 *  🎵 Audius — легальные ПОЛНЫЕ треки через открытый API
 *
 *  Audius — децентрализованная стриминг-платформа, где треки размещают
 *  сами правообладатели (артисты) на условиях платформы. Публичный API
 *  без ключей: поиск, чарты и полноразмерные аудиопотоки (audio/mpeg).
 *  В отличие от iTunes-превью (90 сек), здесь треки играются целиком.
 * ═══════════════════════════════════════════════════════════════════════════ */

import type { MusicTrack } from './yandexWave';

const APP_NAME = 'ZENOVA';

/** Основной шлюз + резервные discovery-хосты */
const HOSTS = [
  'https://api.audius.co',
  'https://discoveryprovider-2.audius.co',
  'https://discoveryprovider-3.audius.co',
];

let cachedHost: string | null = null;

async function fetchJson(url: string, timeoutMs = 7000): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Выбор живого хоста (кэшируется на сессию) */
async function getHost(): Promise<string> {
  if (cachedHost) return cachedHost;
  for (const host of HOSTS) {
    const data = await fetchJson(`${host}/v1/tracks/trending?app_name=${APP_NAME}&limit=1`, 5000);
    if (data && Array.isArray(data.data)) {
      cachedHost = host;
      return host;
    }
  }
  cachedHost = HOSTS[0];
  return cachedHost;
}

/** Полный стрим-URL трека (302 → CDN, HTMLAudio следует редиректу сам) */
export function audiusStreamUrl(host: string, trackId: string): string {
  return `${host}/v1/tracks/${trackId}/stream?app_name=${APP_NAME}`;
}

/** Маппинг жанра Audius в настроение Волны */
function moodFromGenre(genre?: string): MusicTrack['mood'] {
  const g = (genre || '').toLowerCase();
  if (/(hip.?hop|rap|trap)/.test(g)) return 'energy';
  if (/(electronic|house|techno|edm|dance|dnb|drum)/.test(g)) return 'energy';
  if (/(rock|metal|punk)/.test(g)) return 'rock';
  if (/(ambient|chill|lofi|lo-fi|downtempo|jazz|classical)/.test(g)) return 'relax';
  if (/(synth|wave|dark)/.test(g)) return 'night';
  return 'chart';
}

interface AudiusTrack {
  id: string;
  title: string;
  duration: number;
  genre?: string;
  play_count?: number;
  streamable?: boolean;
  artwork?: Record<string, string>;
  user?: { name?: string; handle?: string };
}

function toMusicTrack(host: string, t: AudiusTrack): MusicTrack {
  const art = t.artwork || {};
  const artwork =
    art['480x480'] || art['1000x1000'] || art['150x150'] ||
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

  return {
    id: `audius-${t.id}`,
    title: t.title || 'Без названия',
    artist: t.user?.name || t.user?.handle || 'Неизвестный исполнитель',
    album: 'Audius',
    artwork,
    duration: t.duration || 0,
    streamUrl: audiusStreamUrl(host, t.id),
    genre: t.genre || 'Music',
    mood: moodFromGenre(t.genre),
    plays: t.play_count || 0,
    source: 'audius',
  };
}

/** Поиск ПОЛНЫХ треков (без ключей, CORS: *); offset — пагинация */
export async function searchAudius(query: string, limit = 15, offset = 0): Promise<MusicTrack[]> {
  const cleanQ = query.trim();
  if (!cleanQ) return [];

  const host = await getHost();
  const data = await fetchJson(
    `${host}/v1/tracks/search?query=${encodeURIComponent(cleanQ)}&limit=${limit}&offset=${offset}&app_name=${APP_NAME}`
  );
  const list: AudiusTrack[] = Array.isArray(data?.data) ? data.data : [];
  return list
    .filter((t) => t.id && t.streamable !== false)
    .map((t) => toMusicTrack(host, t));
}

/** Чарт trending — полные треки (глобальный или по жанру); offset — пагинация */
export async function getAudiusTrending(limit = 15, genre?: string, offset = 0): Promise<MusicTrack[]> {
  const host = await getHost();
  let url = `${host}/v1/tracks/trending?limit=${limit}&offset=${offset}&time=week&app_name=${APP_NAME}`;
  if (genre) url += `&genre=${encodeURIComponent(genre)}`;
  const data = await fetchJson(url);
  const list: AudiusTrack[] = Array.isArray(data?.data) ? data.data : [];
  return list
    .filter((t) => t.id && t.streamable !== false)
    .map((t) => toMusicTrack(host, t));
}

/** Плейлист по жанру — синоним trending для настроений Волны */
export const getAudiusTrendingByGenre = (genre: string, limit = 30) =>
  getAudiusTrending(limit, genre);
