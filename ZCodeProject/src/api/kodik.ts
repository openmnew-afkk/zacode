import axios from 'axios';
import type { KodikResponse } from '../types';

/* ===== Kodik API клиент ===== */

const KODIK_API_KEY = import.meta.env.VITE_KODIK_API_KEY || '';
const KODIK_BASE = 'https://kodikapi.com';

/** Проверка наличия Kodik API ключа */
export const hasKodikKey = () => !!KODIK_API_KEY && KODIK_API_KEY !== 'your_kodik_api_key_here';

/**
 * Получить ссылку на плеер по TMDB ID фильма.
 * Kodik ищет фильмы по imdb_id, но мы используем TMDB ID
 * и конвертируем через их API.
 */
export const getPlayerUrl = async (tmdbId: number): Promise<string | null> => {
  try {
    if (!hasKodikKey()) {
      console.warn('Kodik API ключ не указан');
      return null;
    }

    const { data } = await axios.get<KodikResponse>(`${KODIK_BASE}/search`, {
      params: {
        token: KODIK_API_KEY,
        tmdb_id: tmdbId,
        with_material_data: true,
        limit: 1,
      },
    });

    if (data.results && data.results.length > 0) {
      // Возвращаем ссылку на плеер (протокол https)
      const link = data.results[0].link;
      return link.startsWith('//') ? `https:${link}` : link;
    }

    return null;
  } catch (error) {
    console.error('Ошибка получения плеера из Kodik:', error);
    return null;
  }
};
