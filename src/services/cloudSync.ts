/* ===== ZENOVA Cloud Sync — Бессерверная облачная синхронизация =====
 *
 * Архитектура:
 *  1. Мгновенная локальная отзывчивость (localStorage кэш) — 0 мс задержки для пользователя.
 *  2. Фоновая облачная синхронизация (Supabase REST / Serverless KV):
 *     - Общий реестр VIP-пользователей и прав по @username
 *     - Настройки обязательной подписки на Telegram-канал (ОП)
 *     - Глобальные объявления и флаги рекламы
 *  3. Telegram CloudStorage: персональное резервирование состояния на устройстве.
 *  4. 0 рублей расходов на серверы (100% Serverless Edge).
 */

import {
  getStoredGrants,
  type UserGrant,
} from './accessControl';

export interface MandatorySubConfig {
  enabled: boolean;
  channelUsername: string; // @zenova_cinema или канал
  channelUrl: string;      // https://t.me/ZenovaCinema
  channelTitle: string;    // ZENOVA | Cinema & Sound
  subText: string;         // Текст призыва к подписке
}

export interface AppCloudData {
  grants: UserGrant[];
  announcement: string;
  adsEnabled: boolean;
  mandatorySub: MandatorySubConfig;
  blockedMovieIds?: string[]; // Stop-list для требований правообладателей (Notice & Takedown)
  updatedAt: number;
  updatedBy?: string;
}

/* ═══════════ Ключи хранилища ═══════════ */
const CLOUD_CACHE_KEY = 'zenova_cloud_state_v1';
const SUPABASE_URL_KEY = 'zenova_supabase_url';
const SUPABASE_KEY_KEY = 'zenova_supabase_key';
const CUSTOM_KV_URL_KEY = 'zenova_custom_kv_url';
const SUB_CONFIRMED_KEY = 'zenova_channel_subscribed_v1';
const BLOCKED_MOVIES_KEY = 'zenova_blocked_movies_v1';

/* Дефолтные настройки обязательной подписки */
export const DEFAULT_MANDATORY_SUB: MandatorySubConfig = {
  enabled: false,
  channelUsername: '@ZenovaCinema',
  channelUrl: 'https://t.me/ZenovaCinema',
  channelTitle: 'ZENOVA Cinema & Sound',
  subText: 'Подпишитесь на наш официальный Telegram-канал, чтобы смотреть новинки кино, сериалы и слушать музыку без ограничений!',
};

/* Дефолтные настройки облака */
const DEFAULT_CLOUD_DATA: AppCloudData = {
  grants: [],
  announcement: '',
  adsEnabled: true,
  mandatorySub: DEFAULT_MANDATORY_SUB,
  blockedMovieIds: [],
  updatedAt: Date.now(),
  updatedBy: 'System',
};

/** Получить локально кэшированные настройки подписки */
export function getLocalMandatorySub(): MandatorySubConfig {
  try {
    const raw = localStorage.getItem('zenova_mandatory_sub');
    if (raw) return { ...DEFAULT_MANDATORY_SUB, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_MANDATORY_SUB;
}

/** Сохранить локально настройки подписки */
export function saveLocalMandatorySub(sub: MandatorySubConfig): void {
  try {
    localStorage.setItem('zenova_mandatory_sub', JSON.stringify(sub));
  } catch {}
}

/** Проверить, подтвердил ли пользователь подписку на канал */
export function isUserSubscribed(): boolean {
  try {
    const saved = localStorage.getItem(SUB_CONFIRMED_KEY);
    if (!saved) return false;
    const parsed = JSON.parse(saved);
    // Подписка действительна 30 дней, затем мягко перепроверяется
    if (parsed?.confirmedAt && Date.now() - parsed.confirmedAt < 30 * 24 * 60 * 60 * 1000) {
      return true;
    }
  } catch {}
  return false;
}

/** Отметить подписку пользователя как подтверждённую */
export function markUserSubscribed(username?: string): void {
  try {
    localStorage.setItem(SUB_CONFIRMED_KEY, JSON.stringify({
      username: username || 'user',
      confirmedAt: Date.now(),
    }));
  } catch {}

  // Также пробуем сохранить в Telegram CloudStorage если доступен
  try {
    const tgCloud = (window as any).Telegram?.WebApp?.CloudStorage;
    if (tgCloud && typeof tgCloud.setItem === 'function') {
      tgCloud.setItem(SUB_CONFIRMED_KEY, String(Date.now()), () => {});
    }
  } catch {}
}

/** Сбросить статус подписки (для тестов админа) */
export function resetUserSubscribed(): void {
  try {
    localStorage.removeItem(SUB_CONFIRMED_KEY);
  } catch {}
}

/* ═══════════ Конфигурация облачного подключения ═══════════ */

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  try {
    const url = localStorage.getItem(SUPABASE_URL_KEY) || (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const anonKey = localStorage.getItem(SUPABASE_KEY_KEY) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    if (url && anonKey) {
      return { url: url.replace(/\/+$/, ''), anonKey };
    }
  } catch {}
  return null;
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  try {
    if (url) localStorage.setItem(SUPABASE_URL_KEY, url.trim().replace(/\/+$/, ''));
    else localStorage.removeItem(SUPABASE_URL_KEY);

    if (anonKey) localStorage.setItem(SUPABASE_KEY_KEY, anonKey.trim());
    else localStorage.removeItem(SUPABASE_KEY_KEY);
  } catch {}
}

export function getCustomKvUrl(): string {
  try {
    return localStorage.getItem(CUSTOM_KV_URL_KEY) || '';
  } catch {
    return '';
  }
}

export function saveCustomKvUrl(url: string): void {
  try {
    if (url) localStorage.setItem(CUSTOM_KV_URL_KEY, url.trim());
    else localStorage.removeItem(CUSTOM_KV_URL_KEY);
  } catch {}
}

/* ═══════════ Загрузка и Сохранение в Облако ═══════════ */

/**
 * Чтение полного состояния из облака с фолбэками
 */
export async function pullCloudData(): Promise<AppCloudData | null> {
  // 1. Попытка через Supabase (если настроен)
  const sb = getSupabaseConfig();
  if (sb) {
    try {
      const res = await fetch(`${sb.url}/rest/v1/zenova_config?id=eq.global&select=*`, {
        headers: {
          'apikey': sb.anonKey,
          'Authorization': `Bearer ${sb.anonKey}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows[0]?.data) {
          const payload = rows[0].data as AppCloudData;
          saveLocalCache(payload);
          return payload;
        }
      }
    } catch (e) {
      console.warn('Supabase pull error, falling back to local/KV:', e);
    }
  }

  // 2. Попытка через пользовательский или дефолтный REST KV endpoint
  const kvUrl = getCustomKvUrl();
  if (kvUrl) {
    try {
      const res = await fetch(kvUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          saveLocalCache(data);
          return data;
        }
      }
    } catch {}
  }

  // 3. Возвращаем локальный кэш
  return getLocalCache();
}

/**
 * Отправка полного состояния в облако
 */
export async function pushCloudData(data: AppCloudData): Promise<boolean> {
  saveLocalCache(data);

  // 1. Попытка через Supabase
  const sb = getSupabaseConfig();
  if (sb) {
    try {
      const res = await fetch(`${sb.url}/rest/v1/zenova_config`, {
        method: 'POST',
        headers: {
          'apikey': sb.anonKey,
          'Authorization': `Bearer ${sb.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ id: 'global', data, updated_at: new Date().toISOString() }),
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) return true;
    } catch (e) {
      console.warn('Supabase push error:', e);
    }
  }

  // 2. Попытка через пользовательский KV endpoint
  const kvUrl = getCustomKvUrl();
  if (kvUrl) {
    try {
      const res = await fetch(kvUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) return true;
    } catch {}
  }

  return true; // локально гарантированно сохранено
}

function saveLocalCache(data: AppCloudData): void {
  try {
    localStorage.setItem(CLOUD_CACHE_KEY, JSON.stringify(data));
    if (data.mandatorySub) saveLocalMandatorySub(data.mandatorySub);
    if (data.blockedMovieIds) saveLocalBlockedMovies(data.blockedMovieIds);
  } catch {}
}

function getLocalCache(): AppCloudData {
  try {
    const raw = localStorage.getItem(CLOUD_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    ...DEFAULT_CLOUD_DATA,
    grants: getStoredGrants(),
    mandatorySub: getLocalMandatorySub(),
    blockedMovieIds: getLocalBlockedMovies(),
  };
}

/* ═══════════ Блокировка тайтлов по требованию правообладателей (Notice & Takedown) ═══════════ */
export function getLocalBlockedMovies(): string[] {
  try {
    const raw = localStorage.getItem(BLOCKED_MOVIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalBlockedMovies(ids: string[]): void {
  try {
    localStorage.setItem(BLOCKED_MOVIES_KEY, JSON.stringify(ids));
  } catch {}
}

export function isMovieBlockedLocally(idOrKinopoisk: string | number): boolean {
  if (!idOrKinopoisk) return false;
  const list = getLocalBlockedMovies();
  const str = String(idOrKinopoisk).toLowerCase().trim();
  return list.some((item) => String(item).toLowerCase().trim() === str);
}

