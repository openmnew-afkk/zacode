/* ═══════════════════════════════════════════════════════════════════════════
 *  📚 Internet Archive — сотни тысяч ПОЛНЫХ легальных треков
 *
 *  Используем только открытые музыкальные коллекции:
 *   • netlabels        — CC-лицензированные релизы нетлейблов
 *   • live_music_archive — концертные записи групп, разрешивших запись
 *   • 78rpms           — исторические записи в общественном достоянии
 *
 *  API без ключей, CORS открыт. Каждый item — альбом; из него берём
 *  mp3-файлы с реальной длительностью и обложкой.
 * ═══════════════════════════════════════════════════════════════════════════ */

import type { MusicTrack } from './yandexWave';

/** Санитизация запроса от Lucene-спецсимволов */
function cleanQuery(q: string): string {
  return q.replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchJson(url: string, timeoutMs = 9000): Promise<any | null> {
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

interface IaFile {
  name: string;
  length?: string;
  format?: string;
  track?: string;
}

/** «3:56» → 236; «319.8» → 319.8 */
function parseLength(v?: string): number {
  if (!v) return 0;
  if (v.includes(':')) {
    const parts = v.split(':').map(Number);
    return parts.reduce((acc, p) => acc * 60 + (isFinite(p) ? p : 0), 0);
  }
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
}

function toTrack(identifier: string, itemTitle: string, creator: string, file: IaFile, idx: number): MusicTrack {
  const safeName = encodeURIComponent(file.name);
  const duration = Math.round(parseLength(file.length));
  const title = file.name.replace(/\.(mp3|ogg)$/i, '').replace(/^[\d\s._-]+/, '') || itemTitle;

  return {
    id: `ia-${identifier}-${idx}`,
    title,
    artist: creator || 'Internet Archive',
    album: itemTitle,
    artwork: `https://archive.org/services/img/${identifier}`,
    duration,
    streamUrl: `https://archive.org/download/${identifier}/${safeName}`,
    genre: 'Архив музыки',
    mood: 'chart',
    source: 'archive',
  };
}

/** Поиск полных треков в открытых коллекциях Internet Archive */
export async function searchInternetArchive(query: string, page = 1, rows = 10): Promise<MusicTrack[]> {
  const q = cleanQuery(query);
  if (!q) return [];

  const lucene =
    `collection:(netlabels OR live_music_archive OR 78rpms) AND mediatype:(audio)` +
    ` AND format:(MP3) AND (title:(${q}) OR creator:(${q}) OR subject:(${q}))`;

  const url =
    `https://archive.org/advancedsearch.php?q=${encodeURIComponent(lucene)}` +
    `&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=creator` +
    `&rows=${rows}&page=${page}&output=json`;

  const data = await fetchJson(url);
  const docs: Array<{ identifier: string; title?: string; creator?: string }> =
    Array.isArray(data?.response?.docs) ? data.response.docs : [];
  if (docs.length === 0) return [];

  // Метаданные каждого item — параллельно; из альбома берём до 2 треков
  const perItem = await Promise.all(
    docs.slice(0, rows).map(async (doc) => {
      const meta = await fetchJson(`https://archive.org/metadata/${doc.identifier}`);
      if (!meta || !Array.isArray(meta.files)) return [] as MusicTrack[];

      const mp3s = (meta.files as IaFile[])
        .filter((f) => /\.mp3$/i.test(f.name || '') && parseLength(f.length) > 30)
        .slice(0, 2);

      const itemTitle = doc.title || doc.identifier;
      const creator = (Array.isArray(doc.creator) ? doc.creator[0] : doc.creator) || '';
      return mp3s.map((f, i) => toTrack(doc.identifier, itemTitle, creator, f, i));
    })
  );

  return perItem.flat();
}
