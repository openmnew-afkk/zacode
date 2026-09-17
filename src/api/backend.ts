/* ===== Mini Backend API — центральный конфиг, премиум, оплата =====
 *
 * Сервер — это RU-Proxy на российском VPS (proxy/server.js).
 * Он же отдаёт центральный конфиг, поэтому:
 *  — реклама/объявления/реквизиты управляются из админки централизованно;
 *  — премиум выдаётся по нику и действует на всех устройствах;
 *  — после оплаты премиум активируется автоматически.
 *
 * Адрес сервера берётся из RU-Proxy (админка/env), fallback — VITE_API_BASE.
 */

export interface Requisites {
  card: string;
  sbp: string;
  crypto: string;
  note: string;
}

export interface Prices {
  month: number;
  monthFirst: number;
  year: number;
  yearFirst: number;
}

export interface PremiumGrant {
  name: string;
  username: string;
  expiry: number | null;
  forever: boolean;
  by: string;
  at: number;
}

export interface BackendConfig {
  ok: boolean;
  adsEnabled: boolean;
  announcement: string;
  requisites: Requisites;
  prices: Prices;
  autoApprove: boolean;
  moderators: string[];
  premiumGrants: PremiumGrant[];
}

export interface AdminConfig extends BackendConfig {
  payments: Array<{
    username: string;
    plan: 'month' | 'year';
    txn: string;
    status: 'paid' | 'pending';
    at: number;
    auto: boolean;
  }>;
}

const API_BASE_KEY = 'tc_api_base';

function envStr(key: string): string {
  try {
    return String((import.meta as any).env?.[key] || '').trim();
  } catch { return ''; }
}

/** Адрес мини-бэкенда: RU-Proxy или отдельный API (задаётся в админке/env) */
export function getApiBase(): string {
  try {
    const stored = localStorage.getItem(API_BASE_KEY);
    if (stored) return stored.replace(/\/+$/, '');
  } catch {}
  // Приоритет: отдельный API_BASE → RU-Proxy
  const base = envStr('VITE_API_BASE') || envStr('VITE_RU_PROXY');
  return base.replace(/\/+$/, '');
}

export function setApiBase(url: string): void {
  const clean = url.trim().replace(/\/+$/, '');
  try {
    if (clean) localStorage.setItem(API_BASE_KEY, clean);
    else localStorage.removeItem(API_BASE_KEY);
  } catch {}
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return { 'Content-Type': 'application/json', ...extra };
}

/* ════════════ Публичное API ════════════ */

/** Центральный конфиг (реклама, объявления, реквизиты, гранты премиума) */
export async function fetchConfig(): Promise<BackendConfig | null> {
  const base = getApiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/config`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ok ? data : null;
  } catch { return null; }
}

/** Проверка премиума на сервере (по нику/юзернейму) */
export async function checkPremiumRemote(
  name: string
): Promise<{ premium: boolean; forever: boolean; expiry: number | null } | null> {
  const base = getApiBase();
  if (!base || !name.trim()) return null;
  try {
    const res = await fetch(`${base}/api/premium/check`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/** Заявка на оплату → авто-активация премиума (или заявка админу) */
export async function claimPremium(
  username: string,
  plan: 'month' | 'year',
  txn = ''
): Promise<{ ok: boolean; activated: boolean; message: string; expiry?: number | null }> {
  const base = getApiBase();
  if (!base) {
    return { ok: false, activated: false, message: '❌ Сервер не настроен. Попросите админа указать адрес API.' };
  }
  try {
    const res = await fetch(`${base}/api/premium/claim`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ username, plan, txn }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    return data;
  } catch {
    return { ok: false, activated: false, message: '❌ Сервер недоступен, попробуйте позже' };
  }
}

/** Вход модератора по имени */
export async function moderatorLogin(name: string): Promise<{ ok: boolean; role?: string }> {
  const base = getApiBase();
  if (!base) return { ok: false };
  try {
    const res = await fetch(`${base}/api/mod/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name }),
      signal: AbortSignal.timeout(8000),
    });
    return await res.json();
  } catch { return { ok: false }; }
}

/* ════════════ Админ/модератор API ════════════ */

export async function adminGetConfig(adminToken: string): Promise<AdminConfig | null> {
  const base = getApiBase();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/admin/config`, {
      headers: headers({ 'X-Admin-Token': adminToken }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/** POST к админ-API: action-команды и обновление полей */
async function adminPost(
  payload: Record<string, unknown>,
  opts: { adminToken?: string; modUser?: string } = {}
): Promise<{ ok: boolean; message?: string }> {
  const base = getApiBase();
  if (!base) return { ok: false, message: '❌ Сервер не настроен (адрес API)' };
  const h: Record<string, string> = headers();
  if (opts.adminToken) h['X-Admin-Token'] = opts.adminToken;
  if (opts.modUser) h['X-Mod-User'] = opts.modUser;
  try {
    const res = await fetch(`${base}/api/admin/config`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    return await res.json();
  } catch {
    return { ok: false, message: '❌ Сервер недоступен' };
  }
}

/* Команды админа */
export const adminGrantPremium = (token: string, name: string, days: number, forever: boolean) =>
  adminPost({ action: 'grantPremium', name, days, forever }, { adminToken: token });
export const adminRevokePremium = (token: string, name: string) =>
  adminPost({ action: 'revokePremium', name }, { adminToken: token });
export const adminAddModerator = (token: string, name: string) =>
  adminPost({ action: 'addModerator', name }, { adminToken: token });
export const adminRemoveModerator = (token: string, name: string) =>
  adminPost({ action: 'removeModerator', name }, { adminToken: token });
export const adminApprovePayment = (token: string, index: number) =>
  adminPost({ action: 'approvePayment', index }, { adminToken: token });
export const adminRemovePayment = (token: string, index: number) =>
  adminPost({ action: 'removePayment', index }, { adminToken: token });
export const adminSaveConfig = (token: string, fields: Record<string, unknown>) =>
  adminPost(fields, { adminToken: token });

/* Команды модератора (права ограничены на сервере) */
export const modGrantPremium = (name: string, days: number, modName: string) =>
  adminPost({ action: 'grantPremium', name, days }, { modUser: modName });
export const modSaveConfig = (name: string, fields: Record<string, unknown>) =>
  adminPost(fields, { modUser: name });

/* ════════════ Локальный фолбэк (когда сервер недоступен) ════════════ *
 * Гранты сохраняются на устройстве и применяются при каждом запуске.
 * Чтобы премиум виделся на ВСЕХ устройствах — нужен доступный API-сервер. */

const LOCAL_GRANTS_KEY = 'tc_local_grants';

export function getLocalGrants(): PremiumGrant[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_GRANTS_KEY) || '[]'); } catch { return []; }
}

export function saveLocalGrant(name: string, days: number, forever: boolean, by: string): void {
  const clean = name.trim().replace(/^@/, '');
  if (!clean) return;
  const grants = getLocalGrants().filter((g) => g.name.toLowerCase() !== clean.toLowerCase());
  grants.unshift({
    name: clean,
    username: clean,
    expiry: forever ? null : Date.now() + days * 24 * 60 * 60 * 1000,
    forever,
    by,
    at: Date.now(),
  });
  try { localStorage.setItem(LOCAL_GRANTS_KEY, JSON.stringify(grants)); } catch {}
}

export function removeLocalGrant(name: string): void {
  const clean = name.trim().replace(/^@/, '');
  const grants = getLocalGrants().filter((g) => g.name.toLowerCase() !== clean.toLowerCase());
  try { localStorage.setItem(LOCAL_GRANTS_KEY, JSON.stringify(grants)); } catch {}
}

/** Проверка: есть ли действующий локальный грант для имени */
export function findLocalGrant(name: string): PremiumGrant | null {
  const clean = name.trim().replace(/^@/, '').toLowerCase();
  if (!clean) return null;
  const g = getLocalGrants().find(
    (x) => x.name.toLowerCase() === clean || x.username.toLowerCase() === clean
  );
  if (!g) return null;
  if (!g.forever && (!g.expiry || g.expiry <= Date.now())) return null;
  return g;
}
