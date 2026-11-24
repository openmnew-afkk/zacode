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

import { getAllTrending, searchMovies, smartDiscover } from './catalog';

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

export type PremiumPlanId = 'trial' | 'month';

export interface PremiumStatus {
  ok: boolean;
  premium: boolean;
  expiry: number | null;
  trialUsed: boolean;
  arcadeRewardClaimed: boolean;
  ai?: {
    used: number;
    limit: number;
    remaining: number;
    model: string;
  };
}

export function getTelegramInitData(): string {
  try { return String((window as any).Telegram?.WebApp?.initData || ''); } catch { return ''; }
}

async function telegramApi<T>(route: string, payload: Record<string, unknown> = {}): Promise<T> {
  const base = getApiBase();
  if (!base) throw new Error('Сервер оплаты не настроен');
  const initData = getTelegramInitData();
  if (!initData) throw new Error('Откройте ZENOVA внутри Telegram');
  let res: Response;
  try {
    res = await fetch(`${base}${route}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ ...payload, initData }),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new Error('Не удалось связаться с сервером. Проверьте соединение и попробуйте снова.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.ok === false) throw new Error(data?.message || 'Сервер временно недоступен');
  return data as T;
}

const AI_LOCAL_USAGE_KEY = 'zenova_ai_local_usage_v1';

function readLocalPremium(): { premium: boolean; expiry: number | null } {
  try {
    const flag = localStorage.getItem('tc_premium');
    const rawExp = localStorage.getItem('tc_premium_expiry');
    const expiry = rawExp ? Number(rawExp) : null;
    const validExpiry = expiry !== null && Number.isFinite(expiry) && expiry > 0 ? expiry : null;

    if (validExpiry && Date.now() > validExpiry) {
      localStorage.removeItem('tc_premium');
      localStorage.removeItem('tc_premium_expiry');
      return { premium: false, expiry: null };
    }

    const active = flag === 'true' || flag === '1' || (validExpiry !== null && validExpiry > Date.now());
    return { premium: active, expiry: validExpiry };
  } catch {
    return { premium: false, expiry: null };
  }
}

function localUtcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function getLocalAiUsage(premium: boolean): { used: number; limit: number; remaining: number } {
  const limit = premium ? 10 : 2;
  const day = localUtcDay();
  const mode = premium ? 'pro' : 'free';
  try {
    const raw = JSON.parse(localStorage.getItem(AI_LOCAL_USAGE_KEY) || '{}');
    const used = raw.day === day && raw.mode === mode ? Math.max(0, Number(raw.count) || 0) : 0;
    return { used, limit, remaining: Math.max(0, limit - used) };
  } catch {
    return { used: 0, limit, remaining: limit };
  }
}

function incrementLocalAiUsage(premium: boolean): { used: number; limit: number; remaining: number } {
  const limit = premium ? 10 : 2;
  const day = localUtcDay();
  const mode = premium ? 'pro' : 'free';
  const cur = getLocalAiUsage(premium);
  const used = cur.used + 1;
  try {
    localStorage.setItem(AI_LOCAL_USAGE_KEY, JSON.stringify({ day, mode, count: used }));
  } catch {}
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export const fetchPremiumStatus = async (): Promise<PremiumStatus> => {
  const base = getApiBase();
  const initData = getTelegramInitData();
  if (base && initData) {
    try {
      return await telegramApi<PremiumStatus>('/api/premium/status');
    } catch {
      /* fallback to local state */
    }
  }
  const { premium, expiry } = readLocalPremium();
  const aiUsage = getLocalAiUsage(premium);
  let trialUsed = false;
  let arcadeRewardClaimed = false;
  try {
    trialUsed = localStorage.getItem('zenova_trial_used_v1') === '1';
    arcadeRewardClaimed = localStorage.getItem('zen_arcade_won_bonus') === '1';
  } catch {}
  return {
    ok: true,
    premium,
    expiry,
    trialUsed,
    arcadeRewardClaimed,
    ai: {
      used: aiUsage.used,
      limit: aiUsage.limit,
      remaining: aiUsage.remaining,
      model: premium ? 'Gemini 2.5 Pro' : 'DeepSeek V3',
    },
  };
};

export const createPremiumInvoice = (plan: PremiumPlanId) =>
  telegramApi<{ ok: boolean; url: string }>('/api/premium/invoice', { plan });

export interface RoulettePrize {
  id: string;
  label: string;
  days: number;
  tickets?: number;
  gift: boolean;
  chance: number;
}

export interface RouletteSpin {
  segment: number;
  prizeId: string;
  label: string;
  status: string;
  days?: number;
  tickets?: number;
  expiry?: number;
  compensation?: boolean;
}

export const DEFAULT_ROULETTE_PRIZES: RoulettePrize[] = [
  { id: 'pro_1', label: '1 день PRO', days: 1, gift: false, chance: 40 },
  { id: 'pro_2', label: '2 дня PRO', days: 2, gift: false, chance: 25 },
  { id: 'pro_3', label: '3 дня PRO', days: 3, gift: false, chance: 16 },
  { id: 'pro_5', label: '5 дней PRO', days: 5, gift: false, chance: 10 },
  { id: 'pro_7', label: '7 дней PRO', days: 7, gift: false, chance: 8 },
  { id: 'pro_25', label: 'Супер-приз · 25 дней PRO', days: 25, gift: false, chance: 1 },
];

export const ROULETTE_CYCLE_KEY = 'zenova_roulette_cycle_v1';

export interface RouletteCycleStats {
  totalSpins: number;
  wonCycle: number;
  currentCycle: number;
  spinsDoneInCycle: number;
  superAvailableInCycle: boolean;
}

export function readRouletteCycleStats(): RouletteCycleStats {
  let totalSpins = 0;
  let wonCycle = -1;
  try {
    const raw = JSON.parse(localStorage.getItem(ROULETTE_CYCLE_KEY) || '{}');
    if (Number.isFinite(raw?.totalSpins) && raw.totalSpins >= 0) totalSpins = Math.floor(raw.totalSpins);
    if (Number.isFinite(raw?.wonCycle)) wonCycle = Math.floor(raw.wonCycle);
  } catch {}
  const currentCycle = Math.floor(totalSpins / 100);
  return {
    totalSpins,
    wonCycle,
    currentCycle,
    spinsDoneInCycle: totalSpins % 100,
    superAvailableInCycle: wonCycle !== currentCycle,
  };
}

export function writeRouletteCycleStats(totalSpins: number, wonCycle: number): RouletteCycleStats {
  const safeSpins = Math.max(0, Math.floor(totalSpins));
  const safeWon = Math.floor(wonCycle);
  try {
    localStorage.setItem(ROULETTE_CYCLE_KEY, JSON.stringify({ totalSpins: safeSpins, wonCycle: safeWon }));
  } catch {}
  const currentCycle = Math.floor(safeSpins / 100);
  return {
    totalSpins: safeSpins,
    wonCycle: safeWon,
    currentCycle,
    spinsDoneInCycle: safeSpins % 100,
    superAvailableInCycle: safeWon !== currentCycle,
  };
}

export const fetchRouletteConfig = async (): Promise<{ ok: boolean; amount: number; prizes: RoulettePrize[]; giftCompensationDays: number }> => {
  return { ok: true, amount: 10, prizes: DEFAULT_ROULETTE_PRIZES, giftCompensationDays: 25 };
};

export const spinRouletteLocal = (prizes: RoulettePrize[] = DEFAULT_ROULETTE_PRIZES): RouletteSpin => {
  const list = prizes.length >= 6 && prizes.every((p) => !p.gift && !p.tickets && p.days > 0)
    ? prizes
    : DEFAULT_ROULETTE_PRIZES;
  const stats = readRouletteCycleStats();
  const isSuperPrize = (p: RoulettePrize) => p.id === 'pro_25' || p.days >= 25;

  let segment = 0;
  // Супер-приз 25 дней PRO может выпасть максимум 1 раз за 100 круток с человека
  if (stats.superAvailableInCycle && stats.spinsDoneInCycle === 99) {
    const superIdx = list.findIndex(isSuperPrize);
    if (superIdx >= 0) segment = superIdx;
  } else {
    const weights = list.map((p) => {
      if (isSuperPrize(p) && !stats.superAvailableInCycle) return 0;
      return Math.max(0.1, p.chance);
    });
    const total = weights.reduce((acc, w) => acc + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < list.length; i++) {
      if (weights[i] <= 0) continue;
      r -= weights[i];
      if (r <= 0) {
        segment = i;
        break;
      }
    }
  }

  const prize = list[segment] || list[0];
  const wonSuperNow = isSuperPrize(prize);
  const nextCycleStats = writeRouletteCycleStats(
    stats.totalSpins + 1,
    wonSuperNow ? stats.currentCycle : stats.wonCycle
  );

  window.dispatchEvent(new CustomEvent('zenova-giftfest-sync', {
    detail: {
      rouletteTotalSpins: nextCycleStats.totalSpins,
      rouletteWonCycle: nextCycleStats.wonCycle,
    },
  }));

  return {
    segment,
    prizeId: prize.id,
    label: prize.label,
    status: 'fulfilled',
    days: prize.days || 1,
    tickets: 0,
  };
};

export const createRouletteInvoice = () =>
  telegramApi<{ ok: boolean; url: string; spinId: string }>('/api/roulette/invoice');

export const spinRoulette = (spinId: string) =>
  telegramApi<{ ok: boolean; paid: boolean; spin: RouletteSpin; premium: boolean; expiry: number | null; message?: string }>(
    '/api/roulette/spin', { spinId }
  );

export const fetchRouletteSpin = (spinId: string) =>
  telegramApi<{ ok: boolean; paid: boolean; spin: RouletteSpin | null }>('/api/roulette/status', { spinId });

const MODEL_META: Record<'deepseek' | 'gemini' | 'kimi', { label: string; gatewayModel: string }> = {
  deepseek: { label: 'DeepSeek V3', gatewayModel: 'deepseek' },
  gemini: { label: 'Gemini 2.5 Pro', gatewayModel: 'gemini' },
  kimi: { label: 'Kimi K3.1 Pro', gatewayModel: 'openai-large' },
};

async function buildTmdbConciergeReply(prompt: string, modelLabel: string): Promise<string> {
  const q = prompt.toLowerCase();
  const genreMap: Array<{ re: RegExp; genres: number[]; label: string }> = [
    { re: /космос|фантаст|будущ|интерстеллар|sci-fi/i, genres: [878], label: 'научной фантастики' },
    { re: /триллер|напряж|финал|неожидан|твист|мозг/i, genres: [53, 9648], label: 'напряжённых триллеров' },
    { re: /детектив|расслед|нуар|криминал|маньяк/i, genres: [80, 9648], label: 'детективов и расследований' },
    { re: /ужас|страш|хоррор|мистик/i, genres: [27], label: 'атмосферных хорроров' },
    { re: /комед|смеш|уютн|лёгк|легк|вечер/i, genres: [35], label: 'лёгкого и уютного кино' },
    { re: /драм|сильн|слез|слёз|жизн/i, genres: [18], label: 'сильных драм' },
    { re: /боевик|экшн|адреналин|погон/i, genres: [28], label: 'динамичного экшна' },
    { re: /романт|любов|вдво|свидан/i, genres: [10749], label: 'романтического кино' },
    { re: /фэнтез|маги|волшеб|сказк/i, genres: [14, 12], label: 'фэнтези и приключений' },
    { re: /новогод|зим|рождеств|праздник/i, genres: [10751, 35], label: 'уютного зимнего настроения' },
  ];

  const matched = genreMap.find((g) => g.re.test(q));
  const wantSerial = /сериал|мини-сериал|сезон/i.test(q);
  let picks: Array<{ title: string; year: string; rating: string; overview: string }> = [];

  try {
    if (matched) {
      const list = await smartDiscover({
        genres: matched.genres,
        mediaType: wantSerial ? 'tv' : 'movie',
      });
      picks = list.slice(0, 4).map((m) => ({
        title: m.title,
        year: (m.release_date || '').slice(0, 4),
        rating: m.vote_average ? m.vote_average.toFixed(1) : '7.5',
        overview: (m.overview || '').slice(0, 140),
      }));
    } else {
      const searched = await searchMovies(prompt.slice(0, 60), 1);
      const raw = searched.results?.length ? searched.results : await getAllTrending();
      picks = raw.slice(0, 4).map((m) => ({
        title: m.title,
        year: (m.release_date || '').slice(0, 4),
        rating: m.vote_average ? m.vote_average.toFixed(1) : '7.5',
        overview: (m.overview || '').slice(0, 140),
      }));
    }
  } catch {}

  if (!picks.length) {
    return `Как кино-консьерж (${modelLabel}), рекомендую обратить внимание на «Интерстеллар» (2014), «Начало» (2010) и «Остров проклятых» (2009) — все три держат внимание до последних секунд и доступны в каталоге ZENOVA через поиск.`;
  }

  const lines = picks.map((p, idx) => {
    const yr = p.year ? ` (${p.year})` : '';
    const desc = p.overview ? ` — ${p.overview.replace(/\s+\S*$/, '')}…` : '';
    return `${idx + 1}. «${p.title}»${yr} · ★ ${p.rating}${desc}`;
  });
  return `Подборка от ${modelLabel}${matched ? ` в направлении ${matched.label}` : ''}:\n\n${lines.join('\n')}\n\nОткройте любой из них через поиск в ZENOVA — карточка уже есть в базе.`;
}

export const askSynthax = async (
  prompt: string,
  modelId: 'deepseek' | 'gemini' | 'kimi' = 'deepseek'
): Promise<{ ok: boolean; text: string; model: string; modelId?: string; premium: boolean; remaining: number; limit: number; message?: string }> => {
  const base = getApiBase();
  const initData = getTelegramInitData();

  if (base && initData) {
    try {
      return await telegramApi('/api/ai/chat', { prompt, modelId });
    } catch (err) {
      // Если сервер не настроен или недоступен — продолжаем автономно на клиенте
      const msg = err instanceof Error ? err.message : '';
      if (msg && /лимит|исчерпан|только в ZENOVA PRO/i.test(msg)) {
        throw err;
      }
    }
  }

  const { premium } = readLocalPremium();
  if (!premium && modelId !== 'deepseek') {
    throw new Error('Модели Gemini 2.5 Pro и Kimi K3.1 Pro доступны в ZENOVA PRO.');
  }

  const usage = getLocalAiUsage(premium);
  if (usage.remaining <= 0) {
    throw new Error(
      premium
        ? 'Дневной лимит (10 запросов) исчерпан. Попробуйте завтра.'
        : 'Бесплатные запросы (2 в день) закончились. Откройте PRO или выиграйте его в рулетке GiftFest!'
    );
  }

  const meta = MODEL_META[modelId] || MODEL_META.deepseek;
  const sysPrompt =
    'Ты SYNTHAX-9, интеллектуальный кино-консьерж приложения ZENOVA. Отвечай по-русски, структурированно и кратко (до 200 слов). Помогай выбирать фильмы и сериалы, объяснять жанры и настроение, без спойлеров.';

  let replyText = '';
  try {
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: meta.gatewayModel,
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        seed: Math.floor(Math.random() * 9999),
      }),
      signal: AbortSignal.timeout(9500),
    });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      const content = String(json?.choices?.[0]?.message?.content || '').trim();
      if (content && content.length > 15 && !/pollinations/i.test(content)) {
        replyText = content;
      }
    }
  } catch {
    /* fallback на GET или TMDB-консьерж */
  }

  if (!replyText) {
    replyText = await buildTmdbConciergeReply(prompt, meta.label);
  }

  const updated = incrementLocalAiUsage(premium);
  return {
    ok: true,
    text: replyText.slice(0, 12000),
    model: meta.label,
    modelId,
    premium,
    remaining: updated.remaining,
    limit: updated.limit,
  };
};

export const startArcadeRun = () =>
  telegramApi<{ ok: boolean; claimed: boolean; runId: string | null }>('/api/arcade/start');

export const claimArcadeReward = (runId: string, score: number) =>
  telegramApi<{ ok: boolean; activated: boolean; claimed: boolean; expiry?: number | null; message: string }>(
    '/api/arcade/claim', { runId, score }
  );

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

/* ════════════ Звёзды (Telegram Stars) ════════════ */

/** Создать счёт Telegram Stars на поддержку проекта (сумма 1 – ∞).
 *  Возвращает ссылку на инвойс — открывается через WebApp.openInvoice. */
export async function createStarsInvoice(
  amount: number,
  movieTitle?: string
): Promise<{ ok: boolean; url?: string; message: string }> {
  const base = getApiBase();
  const clean = Math.max(1, Math.floor(Number(amount) || 0));
  if (!base) {
    return { ok: false, message: '⭐ Платёж звёздами не настроен: укажите адрес API в админ-панели' };
  }
  try {
    const res = await fetch(`${base}/api/stars/invoice`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ amount: clean, title: movieTitle }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (data?.ok && data.url) return { ok: true, url: data.url, message: 'ok' };
    return { ok: false, message: data?.message || '❌ Не удалось создать счёт' };
  } catch {
    return { ok: false, message: '❌ Сервер недоступен, попробуйте позже' };
  }
}

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
