/* ===== AURA Access Control — Автономная система прав по @username =====
 *
 * Архитектура без выделенного бэкенд-сервера и без платных API:
 *  1. Мастер-список в коде: @MikySauce и доверенные никнеймы всегда имеют полный доступ.
 *  2. Локальный и облачный реестр (Serverless KV / localStorage):
 *     Администратор выдаёт права любому @username в 1 клик прямо из админки.
 *  3. Автоматическое распознавание Telegram-аккаунта:
 *     При запуске WebApp никнейм сверяется с реестром — права применяются мгновенно.
 *  4. Генератор персональных VIP-ключей:
 *     Админ может сгенерировать токен или ссылку для пользователя, чтобы активировать VIP офлайн.
 */

export type UserRole = 'admin' | 'moderator' | 'vip' | 'user';
export type DurationOption = '2d' | '5d' | '7d' | '30d' | '90d' | '365d' | 'forever';

export interface UserGrant {
  username: string; // без символа @, в нижнем регистре
  displayName: string; // оригинальное отображение
  role: UserRole;
  expiry: number | null; // timestamp в ms или null (бессрочно)
  durationLabel: string;
  grantedAt: number;
  grantedBy: string;
  note?: string;
}

/* ═══════════ Мастер-списки в коде ═══════════ */
export const MASTER_ADMINS: string[] = ['MikySauce'];
export const MASTER_MODERATORS: string[] = [];
export const MASTER_VIPS: string[] = [];

const REGISTRY_STORAGE_KEY = 'aura_access_registry_v2';
const KV_ENDPOINT_KEY = 'aura_kv_sync_url';

/** Бесплатный серверless-шлюз для мгновенной синхронизации реестра без VPS (kvdb / raw json) */
const DEFAULT_KV_URL = 'https://kvdb.io/4y9pQz8tW2mXb6v7cJ1a/aura_users';

export function normalizeUsername(u: string): string {
  return (u || '').trim().replace(/^@/, '').toLowerCase();
}

/** Загрузка локального реестра */
export function getStoredGrants(): UserGrant[] {
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Сохранение реестра локально и отправка в облако */
export function saveGrants(grants: UserGrant[]): void {
  try {
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(grants));
  } catch {}
  // Фоновая синхронизация с бесплатным хранилищем
  syncToCloud(grants).catch(() => {});
}

/** Преобразование опции длительности в timestamp */
export function durationToExpiry(duration: DurationOption): { expiry: number | null; label: string } {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (duration) {
    case '2d':
      return { expiry: now + 2 * day, label: '2 дня' };
    case '5d':
      return { expiry: now + 5 * day, label: '5 дней' };
    case '7d':
      return { expiry: now + 7 * day, label: '7 дней' };
    case '30d':
      return { expiry: now + 30 * day, label: '30 дней' };
    case '90d':
      return { expiry: now + 90 * day, label: '3 месяца' };
    case '365d':
      return { expiry: now + 365 * day, label: '1 год' };
    case 'forever':
    default:
      return { expiry: null, label: 'Бессрочно (Навсегда)' };
  }
}

/**
 * Проверка прав пользователя по его никнейму
 */
export function resolveUserAccess(username: string): {
  isAdmin: boolean;
  isModerator: boolean;
  isVip: boolean;
  role: UserRole;
  expiry: number | null;
  grantInfo?: UserGrant;
} {
  const clean = normalizeUsername(username);

  // 1. Проверка в мастер-списке супер-админов
  if (MASTER_ADMINS.some((a) => normalizeUsername(a) === clean)) {
    return {
      isAdmin: true,
      isModerator: false,
      isVip: true,
      role: 'admin',
      expiry: null,
    };
  }

  // 2. Проверка в реестре грантов
  const grants = getStoredGrants();
  const found = grants.find((g) => g.username === clean);

  if (found) {
    const isExpired = found.expiry !== null && found.expiry <= Date.now();
    if (!isExpired) {
      return {
        isAdmin: found.role === 'admin',
        isModerator: found.role === 'moderator',
        isVip: found.role === 'vip' || found.role === 'admin' || found.role === 'moderator',
        role: found.role,
        expiry: found.expiry,
        grantInfo: found,
      };
    }
  }

  return {
    isAdmin: false,
    isModerator: false,
    isVip: false,
    role: 'user',
    expiry: null,
  };
}

/**
 * Добавить или обновить права для пользователя по @username
 */
export function grantAccessToUser(
  rawUsername: string,
  role: UserRole,
  duration: DurationOption,
  grantedBy: string,
  note = ''
): UserGrant | null {
  const clean = normalizeUsername(rawUsername);
  if (!clean) return null;

  const { expiry, label } = durationToExpiry(duration);
  const grants = getStoredGrants().filter((g) => g.username !== clean);

  const newGrant: UserGrant = {
    username: clean,
    displayName: rawUsername.trim().startsWith('@') ? rawUsername.trim() : `@${rawUsername.trim()}`,
    role,
    expiry,
    durationLabel: label,
    grantedAt: Date.now(),
    grantedBy: grantedBy || 'MikySauce',
    note,
  };

  grants.unshift(newGrant);
  saveGrants(grants);
  return newGrant;
}

/**
 * Отозвать права у пользователя
 */
export function revokeUserAccess(rawUsername: string): void {
  const clean = normalizeUsername(rawUsername);
  const grants = getStoredGrants().filter((g) => g.username !== clean);
  saveGrants(grants);
}

/**
 * Продлить доступ пользователю на N дней
 */
export function extendUserAccess(rawUsername: string, extraDays = 30): UserGrant | null {
  const clean = normalizeUsername(rawUsername);
  const grants = getStoredGrants();
  const index = grants.findIndex((g) => g.username === clean);
  if (index === -1) return null;

  const current = grants[index];
  const base = current.expiry && current.expiry > Date.now() ? current.expiry : Date.now();
  const nextExpiry = base + extraDays * 24 * 60 * 60 * 1000;

  grants[index] = {
    ...current,
    expiry: nextExpiry,
    durationLabel: `+${extraDays} дн. (до ${new Date(nextExpiry).toLocaleDateString('ru-RU')})`,
  };

  saveGrants(grants);
  return grants[index];
}

/* ═══════════ Генерация VIP-токенов (Офлайн) ═══════════ */
export function generateVipToken(username: string, role: UserRole, duration: DurationOption): string {
  const clean = normalizeUsername(username);
  const payload = `${clean}:${role}:${duration}:${Date.now()}`;
  const encoded = btoa(unescape(encodeURIComponent(payload))).replace(/=/g, '');
  return `AURA-${encoded}`;
}

export function parseVipToken(token: string): { username: string; role: UserRole; duration: DurationOption } | null {
  try {
    const raw = token.replace(/^AURA-/, '').trim();
    const decoded = decodeURIComponent(escape(atob(raw)));
    const [username, role, duration] = decoded.split(':');
    if (username && role && duration) {
      return { username, role: role as UserRole, duration: duration as DurationOption };
    }
  } catch {}
  return null;
}

/* ═══════════ Синхронизация с бесплатным облачным KV ═══════════ */
export async function syncFromCloud(): Promise<UserGrant[]> {
  try {
    const endpoint = localStorage.getItem(KV_ENDPOINT_KEY) || DEFAULT_KV_URL;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return getStoredGrants();
    const cloudGrants = await res.json();
    if (Array.isArray(cloudGrants)) {
      // Объединяем с локальными, отдавая приоритет более свежим
      const local = getStoredGrants();
      const map = new Map<string, UserGrant>();
      local.forEach((g) => map.set(g.username, g));
      cloudGrants.forEach((g: UserGrant) => {
        const existing = map.get(g.username);
        if (!existing || g.grantedAt >= existing.grantedAt) {
          map.set(g.username, g);
        }
      });
      const merged = Array.from(map.values());
      try {
        localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(merged));
      } catch {}
      return merged;
    }
  } catch {}
  return getStoredGrants();
}

async function syncToCloud(grants: UserGrant[]): Promise<void> {
  try {
    const endpoint = localStorage.getItem(KV_ENDPOINT_KEY) || DEFAULT_KV_URL;
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grants),
      signal: AbortSignal.timeout(6000),
    });
  } catch {}
}
