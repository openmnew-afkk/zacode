/* ═══════════════════════════════════════════════════════════
 * RU-Proxy + Mini Backend — обход гео-блока российских плееров
 * и центральное управление приложением (админка, премиум, оплата)
 *
 * Проблема: Kodik, Collaps, VideoCDN и др. работают только с
 * российских IP. Пользователи Telegram Mini App часто сидят
 * через VPN (зарубежный IP) → плееры не грузятся.
 *
 * Решение: этот сервер разворачивается на российском VPS.
 *  1. /?url=<encoded>    — прокси плееров (запрос с рф IP).
 *  2. /api/config        — центральный конфиг (реклама, объявления,
 *     реквизиты, цены) — действует на ВСЕХ пользователей.
 *  3. /api/admin/config  — управление: выдача премиума по нику,
 *     модераторы, реквизиты, платежи.
 *  4. /api/premium/claim — авто-активация премиума после оплаты.
 *
 * Запуск:  node server.js   (PORT из env или 8080)
 * Docker:  см. README.md
 * ═══════════════════════════════════════════════════════════ */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 8080;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'Kodik987412365';
const DATA_FILE = path.join(__dirname, 'data.json');

/* ════════════ Хранилище (файл data.json) ════════════ */

const DEFAULT_DATA = {
  adsEnabled: true,
  announcement: '',
  autoApprove: false,
  requisites: { card: '', sbp: '', crypto: '', note: '' },
  prices: { month: 249, monthFirst: 29, year: 0, yearFirst: 0 },
  /* Выданный премиум: { name, username, expiry, forever, by, at } */
  premiumGrants: [],
  telegramPremiumGrants: [],
  starInvoices: [],
  processedTelegramCharges: [],
  arcadeRewardClaims: [],
  arcadeRuns: [],
  aiUsage: [],
  telegramUpdateOffset: 0,
  /* Платежи: { username, plan, txn, status: 'paid'|'pending', at } */
  payments: [],
  /* Модераторы: ['username', 'Имя Фамилия', …] */
  moderators: [],
};

let data = loadData();
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch { return { ...DEFAULT_DATA }; }
}
function saveData() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch {}
}

/* ════════════ Утилиты ════════════ */

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token, X-Mod-User',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); }
    });
  });
}

function normalizeName(name) {
  return String(name || '').trim().replace(/^@/, '').toLowerCase();
}

/** Найти действующий грант премиума по имени/юзернейму */
function findGrant(name) {
  const n = normalizeName(name);
  if (!n) return null;
  return data.premiumGrants.find(
    (g) => normalizeName(g.username) === n || normalizeName(g.name) === n
  ) || null;
}

/** Выдать/продлить премиум пользователю */
function grantPremium(opts) {
  const display = String(opts.username || opts.name || '').trim().replace(/^@/, '');
  let grant = findGrant(display);
  if (!grant) {
    grant = { name: display, username: display, expiry: null, forever: false, by: opts.by, at: Date.now() };
    data.premiumGrants.push(grant);
  }
  if (opts.forever) {
    grant.forever = true;
    grant.expiry = null;
  } else {
    grant.forever = false;
    const base = grant.expiry && grant.expiry > Date.now() ? grant.expiry : Date.now();
    grant.expiry = base + (opts.days || 30) * 24 * 60 * 60 * 1000;
  }
  grant.by = opts.by || grant.by;
  grant.at = Date.now();
  saveData();
  return grant;
}

function isGrantActive(grant) {
  if (!grant) return false;
  if (grant.forever) return true;
  return !!grant.expiry && grant.expiry > Date.now();
}

const PREMIUM_PLANS = {
  trial: { days: 7, amount: 29, title: 'ZENOVA PRO · 7 дней' },
  month: { days: 30, amount: 249, title: 'ZENOVA PRO · 30 дней' },
};

const ROULETTE_PRIZES = [
  { id: 'pro_1', label: '1 день PRO', days: 1, weight: 7000 },
  { id: 'pro_2', label: '2 дня PRO', days: 2, weight: 2000 },
  { id: 'pro_3', label: '3 дня PRO', days: 3, weight: 700 },
  { id: 'pro_7', label: '7 дней PRO', days: 7, weight: 280 },
  { id: 'gift', label: 'Подарок Telegram', gift: true, weight: 20 },
];

function roulettePublicPrizes() {
  return ROULETTE_PRIZES.map(({ id, label, days, gift, weight }) => ({
    id, label, days: days || 0, gift: !!gift, chance: weight / 100,
  }));
}

function chooseRoulettePrize() {
  const roll = crypto.randomInt(0, 10000);
  let cursor = 0;
  for (let index = 0; index < ROULETTE_PRIZES.length; index++) {
    cursor += ROULETTE_PRIZES[index].weight;
    if (roll < cursor) return { index, prize: ROULETTE_PRIZES[index] };
  }
  return { index: 0, prize: ROULETTE_PRIZES[0] };
}

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}

function aiLimits(premium) {
  return Math.max(1, Number(process.env[premium ? 'AI_PREMIUM_DAILY_LIMIT' : 'AI_FREE_DAILY_LIMIT']) || (premium ? 10 : 2));
}

function aiUsageFor(userId, premium) {
  const mode = premium ? 'premium' : 'free';
  const day = utcDay();
  let usage = (data.aiUsage || []).find((item) => Number(item.userId) === Number(userId) && item.day === day && item.mode === mode);
  if (!usage) {
    usage = { userId: Number(userId), day, mode, count: 0 };
    data.aiUsage.unshift(usage);
  }
  return usage;
}

function botToken() {
  return String(process.env.BOT_TOKEN || '').trim();
}

function validateTelegramInitData(raw) {
  const token = botToken();
  if (!token) throw new Error('BOT_TOKEN не настроен на сервере');
  const params = new URLSearchParams(String(raw || ''));
  const receivedHash = params.get('hash') || '';
  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) throw new Error('Некорректные данные Telegram');
  params.delete('hash');
  const checkString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const expected = crypto.createHmac('sha256', secret).update(checkString).digest('hex');
  const valid = receivedHash.length === expected.length && crypto.timingSafeEqual(
    Buffer.from(receivedHash, 'hex'), Buffer.from(expected, 'hex')
  );
  if (!valid) throw new Error('Подпись Telegram не подтверждена');
  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 86400) {
    throw new Error('Сессия Telegram устарела, перезапустите приложение');
  }
  const user = JSON.parse(params.get('user') || 'null');
  if (!user || !Number.isSafeInteger(Number(user.id)) || Number(user.id) <= 0) {
    throw new Error('Пользователь Telegram не найден');
  }
  return { id: Number(user.id), username: String(user.username || ''), firstName: String(user.first_name || '') };
}

function telegramIdentity(body) {
  return validateTelegramInitData(body && body.initData);
}

function findTelegramGrant(userId) {
  return (data.telegramPremiumGrants || []).find((grant) => Number(grant.userId) === Number(userId)) || null;
}

function grantTelegramPremium(user, days, by) {
  let grant = findTelegramGrant(user.id);
  if (!grant) {
    grant = { userId: user.id, username: user.username, expiry: 0, forever: false };
    data.telegramPremiumGrants.push(grant);
  }
  const base = grant.expiry > Date.now() ? grant.expiry : Date.now();
  grant.expiry = base + days * 86400000;
  grant.username = user.username || grant.username;
  grant.by = by;
  grant.at = Date.now();
  saveData();
  return grant;
}

function trialUsed(userId) {
  return (data.starInvoices || []).some((invoice) =>
    Number(invoice.userId) === Number(userId) && invoice.plan === 'trial' && invoice.status === 'paid'
  );
}

function arcadeRewardClaimed(userId) {
  return (data.arcadeRewardClaims || []).some((claim) => Number(claim.userId) === Number(userId));
}

async function telegramApi(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.description || 'Ошибка Telegram API');
  return result.result;
}

async function fulfillRouletteSpin(invoice, user) {
  if (invoice.spin) return invoice.spin;
  const { index, prize } = chooseRoulettePrize();
  invoice.spin = {
    segment: index,
    prizeId: prize.id,
    label: prize.label,
    status: 'processing',
    at: Date.now(),
  };
  saveData();

  if (prize.gift) {
    const giftId = String(process.env.ROULETTE_GIFT_ID || '').trim();
    try {
      if (!giftId) throw new Error('Подарок не настроен');
      await telegramApi('sendGift', { user_id: user.id, gift_id: giftId, pay_for_upgrade: false });
      invoice.spin.status = 'gift_sent';
      invoice.spin.giftId = giftId;
    } catch (error) {
      const grant = grantTelegramPremium(user, 7, 'roulette:gift_compensation');
      invoice.spin.status = 'compensated';
      invoice.spin.prizeId = 'pro_7';
      invoice.spin.label = '7 дней PRO вместо подарка';
      invoice.spin.days = 7;
      invoice.spin.expiry = grant.expiry;
      invoice.spin.compensation = true;
      console.error('Roulette gift:', error.message);
    }
  } else {
    const grant = grantTelegramPremium(user, prize.days, `roulette:${prize.id}`);
    invoice.spin.status = 'fulfilled';
    invoice.spin.days = prize.days;
    invoice.spin.expiry = grant.expiry;
  }
  saveData();
  return invoice.spin;
}

function aiProvider(premium, requestedModel) {
  const choice = String(requestedModel || (premium ? 'gemini' : 'deepseek')).toLowerCase();
  if (!premium && choice !== 'deepseek') {
    const err = new Error('Модели Gemini и Kimi K3.1 Pro доступны только в ZENOVA PRO');
    err.status = 403;
    throw err;
  }

  if (choice === 'kimi') {
    return {
      id: 'kimi',
      label: 'Kimi K3.1 Pro',
      baseUrl: String(process.env.AI_PREMIUM_BASE_URL || 'https://api.moonshot.cn/v1').replace(/\/+$/, ''),
      apiKey: String(process.env.AI_PREMIUM_API_KEY || process.env.MOONSHOT_API_KEY || '').trim(),
      model: String(process.env.AI_PREMIUM_MODEL || 'kimi-k3.1-pro').trim(),
      premium: true,
    };
  }

  if (choice === 'gemini') {
    return {
      id: 'gemini',
      label: 'Gemini 2.5 Pro',
      baseUrl: String(process.env.AI_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, ''),
      apiKey: String(process.env.AI_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim(),
      model: String(process.env.AI_GEMINI_MODEL || 'gemini-2.5-flash').trim(),
      premium: true,
    };
  }

  const deepseekKey = String(process.env.DEEPSEEK_API_KEY || process.env.AI_BASIC_API_KEY || '').trim();
  if (deepseekKey) {
    return {
      id: 'deepseek',
      label: 'DeepSeek V3',
      baseUrl: String(process.env.AI_BASIC_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, ''),
      apiKey: deepseekKey,
      model: String(process.env.AI_BASIC_MODEL || 'deepseek-chat').trim(),
      premium,
    };
  }

  return {
    id: 'deepseek',
    label: 'DeepSeek V3',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: String(process.env.GEMINI_API_KEY || '').trim(),
    model: 'gemini-2.5-flash',
    premium,
  };
}

async function requestAiChat(user, prompt, premium, requestedModel) {
  const provider = aiProvider(premium, requestedModel);
  if (!provider.apiKey) throw new Error(`${provider.label} пока не настроен на сервере`);
  const usage = aiUsageFor(user.id, premium);
  const limit = aiLimits(premium);
  if (usage.count >= limit) {
    const error = new Error(premium ? 'Дневной лимит (10 запросов) исчерпан. Попробуйте завтра.' : 'Бесплатные запросы на сегодня закончились. Перейдите на PRO для 10 запросов в день.');
    error.status = 429;
    throw error;
  }

  const payload = {
    model: provider.model,
    messages: [
      {
        role: 'system',
        content: 'Ты SYNTHAX-9, интеллектуальный кино-консьерж ZENOVA. Отвечай на русском, структурно и по делу. Помогай подбирать фильмы и сериалы, сравнивать сюжеты, разбирать финалы без лишних спойлеров и составлять план просмотра. Не выдумывай факты, рейтинги и ссылки. До 220 слов.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: premium ? 800 : 450,
    ...(provider.id === 'kimi' ? { reasoning_effort: 'low' } : {}),
  };
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    console.error('AI provider:', response.status, result && result.error && result.error.message);
    throw new Error('ИИ-сервис временно недоступен. Попробуйте ещё раз.');
  }
  const text = String(result && result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content || '').trim();
  if (!text) throw new Error('ИИ вернул пустой ответ. Попробуйте переформулировать запрос.');
  usage.count += 1;
  data.aiUsage = data.aiUsage.filter((item) => item.day === utcDay()).slice(0, 10000);
  saveData();
  return {
    text: text.slice(0, 12000),
    model: provider.label,
    modelId: provider.id,
    premium,
    remaining: Math.max(0, limit - usage.count),
    limit,
  };
}

async function processTelegramUpdate(update) {
  if (update.pre_checkout_query) {
    const query = update.pre_checkout_query;
    const invoice = (data.starInvoices || []).find((item) => item.payload === query.invoice_payload);
    const donation = String(query.invoice_payload || '').startsWith('stars_tip_');
    const valid = donation || (invoice && invoice.status === 'created' &&
      Number(invoice.userId) === Number(query.from && query.from.id) &&
      invoice.amount === query.total_amount && query.currency === 'XTR');
    await telegramApi('answerPreCheckoutQuery', valid
      ? { pre_checkout_query_id: query.id, ok: true }
      : { pre_checkout_query_id: query.id, ok: false, error_message: 'Счёт недействителен. Создайте новый в ZENOVA.' });
    return;
  }

  const payment = update.message && update.message.successful_payment;
  if (!payment || String(payment.invoice_payload || '').startsWith('stars_tip_')) return;
  const invoice = (data.starInvoices || []).find((item) => item.payload === payment.invoice_payload);
  if (!invoice || invoice.status === 'paid') return;
  const userId = Number(update.message.from && update.message.from.id);
  if (Number(invoice.userId) !== userId || invoice.amount !== payment.total_amount || payment.currency !== 'XTR') return;
  const chargeId = String(payment.telegram_payment_charge_id || '');
  if (!chargeId || (data.processedTelegramCharges || []).includes(chargeId)) return;
  if (invoice.plan === 'trial' && trialUsed(userId)) return;
  if (invoice.kind !== 'roulette' && !PREMIUM_PLANS[invoice.plan]) return;

  invoice.status = 'paid';
  invoice.paidAt = Date.now();
  invoice.chargeId = chargeId;
  data.processedTelegramCharges.unshift(chargeId);
  data.processedTelegramCharges = data.processedTelegramCharges.slice(0, 1000);
  if (invoice.kind === 'roulette') {
    saveData();
    return;
  }
  const plan = PREMIUM_PLANS[invoice.plan];
  grantTelegramPremium({ id: userId, username: String(update.message.from.username || invoice.username || '') }, plan.days, `stars:${invoice.plan}`);
}

/* ════════════ API-маршруты ════════════ */

async function handleApi(req, res, reqUrl) {
  const route = reqUrl.pathname;

  /* ── Публичный конфиг (для всех пользователей) ── */
  if (route === '/api/config' && req.method === 'GET') {
    return json(res, 200, {
      ok: true,
      adsEnabled: data.adsEnabled,
      announcement: data.announcement,
      requisites: data.requisites,
      prices: data.prices,
      autoApprove: data.autoApprove,
      moderators: data.moderators,
      /* Отдаём только действующие гранты */
      premiumGrants: data.premiumGrants.filter(isGrantActive),
    });
  }

  /* ── Проверка премиума по нику (для входа в приложение) ── */
  if (route === '/api/premium/check' && req.method === 'POST') {
    const body = await readBody(req);
    const grant = findGrant(body.name || body.username);
    if (isGrantActive(grant)) {
      return json(res, 200, { ok: true, premium: true, forever: !!grant.forever, expiry: grant.expiry });
    }
    return json(res, 200, { ok: true, premium: false });
  }

  if (route === '/api/telegram/webhook' && req.method === 'POST') {
    const configured = String(process.env.TELEGRAM_WEBHOOK_SECRET || '');
    if (!configured || req.headers['x-telegram-bot-api-secret-token'] !== configured) {
      return json(res, 403, { ok: false, error: 'Webhook secret rejected' });
    }
    const update = await readBody(req);
    await processTelegramUpdate(update);
    return json(res, 200, { ok: true });
  }

  if (route === '/api/premium/status' && req.method === 'POST') {
    try {
      const user = telegramIdentity(await readBody(req));
      const grant = findTelegramGrant(user.id);
      const premium = isGrantActive(grant);
      const usage = aiUsageFor(user.id, premium);
      const limit = aiLimits(premium);
      return json(res, 200, {
        ok: true,
        premium,
        expiry: grant && grant.expiry ? grant.expiry : null,
        trialUsed: trialUsed(user.id),
        arcadeRewardClaimed: arcadeRewardClaimed(user.id),
        ai: { used: usage.count, limit, remaining: Math.max(0, limit - usage.count), model: aiProvider(premium).model },
      });
    } catch (error) {
      return json(res, 401, { ok: false, message: error.message });
    }
  }

  if (route === '/api/premium/invoice' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const user = telegramIdentity(body);
      const plan = PREMIUM_PLANS[body.plan];
      if (!plan) return json(res, 400, { ok: false, message: 'Неизвестный тариф' });
      if (body.plan === 'trial' && trialUsed(user.id)) {
        return json(res, 409, { ok: false, message: 'Пробный период уже использован на этом аккаунте' });
      }
      const pendingTrial = body.plan === 'trial' && data.starInvoices.find((invoice) =>
        Number(invoice.userId) === user.id && invoice.plan === 'trial' && invoice.status === 'created'
      );
      if (pendingTrial) {
        if (pendingTrial.url) return json(res, 200, { ok: true, url: pendingTrial.url });
        return json(res, 409, { ok: false, message: 'Счёт уже создаётся, повторите через секунду' });
      }
      const payload = `zenova_${body.plan}_${user.id}_${crypto.randomUUID()}`;
      const invoice = {
        payload, userId: user.id, username: user.username, plan: body.plan,
        amount: plan.amount, days: plan.days, status: 'created', createdAt: Date.now(),
      };
      data.starInvoices.unshift(invoice);
      data.starInvoices = data.starInvoices.slice(0, 2000);
      saveData();
      let url;
      try {
        url = await telegramApi('createInvoiceLink', {
          title: plan.title,
          description: body.plan === 'trial'
            ? 'Пробные 7 дней ZENOVA PRO. Один раз на аккаунт, без автопродления.'
            : '30 дней ZENOVA PRO. Разовый платёж, без автопродления.',
          payload,
          currency: 'XTR',
          prices: [{ label: plan.title, amount: plan.amount }],
        });
      } catch (error) {
        invoice.status = 'failed';
        saveData();
        throw error;
      }
      invoice.url = url;
      saveData();
      return json(res, 200, { ok: true, url });
    } catch (error) {
      return json(res, 400, { ok: false, message: error.message || 'Не удалось создать счёт' });
    }
  }

  if (route === '/api/roulette/config' && req.method === 'GET') {
    return json(res, 200, { ok: true, amount: 10, currency: 'XTR', prizes: roulettePublicPrizes(), giftCompensationDays: 7 });
  }

  if (route === '/api/roulette/invoice' && req.method === 'POST') {
    try {
      const user = telegramIdentity(await readBody(req));
      const payload = `zenova_roulette_${user.id}_${crypto.randomUUID()}`;
      const invoice = {
        kind: 'roulette', payload, userId: user.id, username: user.username,
        amount: 10, status: 'created', createdAt: Date.now(),
      };
      data.starInvoices.unshift(invoice);
      data.starInvoices = data.starInvoices.slice(0, 2000);
      saveData();
      let url;
      try {
        url = await telegramApi('createInvoiceLink', {
          title: 'ZENOVA · Кино-рулетка',
          description: 'Одно вращение за 10 Stars. Гарантированный приз: 1–7 дней PRO или подарок Telegram. Шансы указаны в приложении.',
          payload,
          currency: 'XTR',
          prices: [{ label: 'Одно вращение Кино-рулетки', amount: 10 }],
        });
      } catch (error) {
        invoice.status = 'failed';
        saveData();
        throw error;
      }
      invoice.url = url;
      saveData();
      return json(res, 200, { ok: true, url, spinId: payload });
    } catch (error) {
      return json(res, 400, { ok: false, message: error.message || 'Не удалось создать счёт' });
    }
  }

  if (route === '/api/roulette/spin' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const user = telegramIdentity(body);
      const invoice = (data.starInvoices || []).find((item) => item.kind === 'roulette' && item.payload === body.spinId && Number(item.userId) === Number(user.id));
      if (!invoice) return json(res, 404, { ok: false, message: 'Вращение не найдено' });
      if (invoice.status !== 'paid') return json(res, 409, { ok: false, paid: false, message: 'Telegram ещё не подтвердил оплату. Повторите через несколько секунд.' });
      const spin = await fulfillRouletteSpin(invoice, user);
      const grant = findTelegramGrant(user.id);
      return json(res, 200, { ok: true, paid: true, spin, premium: isGrantActive(grant), expiry: grant && grant.expiry ? grant.expiry : null });
    } catch (error) {
      return json(res, 400, { ok: false, message: error.message || 'Не удалось выполнить вращение' });
    }
  }

  if (route === '/api/roulette/status' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const user = telegramIdentity(body);
      const invoice = (data.starInvoices || []).find((item) => item.kind === 'roulette' && item.payload === body.spinId && Number(item.userId) === Number(user.id));
      if (!invoice) return json(res, 404, { ok: false, message: 'Вращение не найдено' });
      return json(res, 200, { ok: true, paid: invoice.status === 'paid', spin: invoice.spin || null });
    } catch (error) {
      return json(res, 401, { ok: false, message: error.message });
    }
  }

  if (route === '/api/ai/chat' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const user = telegramIdentity(body);
      const prompt = String(body.prompt || '').trim();
      if (!prompt) return json(res, 400, { ok: false, message: 'Напишите запрос к SYNTHAX' });
      if (prompt.length > 1200) return json(res, 400, { ok: false, message: 'Сократите запрос до 1200 символов' });
      const premium = isGrantActive(findTelegramGrant(user.id));
      const modelId = String(body.modelId || (premium ? 'gemini' : 'deepseek'));
      const result = await requestAiChat(user, prompt, premium, modelId);
      return json(res, 200, { ok: true, ...result });
    } catch (error) {
      return json(res, error.status || 400, { ok: false, message: error.message || 'ИИ временно недоступен' });
    }
  }

  if (route === '/api/arcade/start' && req.method === 'POST') {
    try {
      const user = telegramIdentity(await readBody(req));
      if (arcadeRewardClaimed(user.id)) {
        return json(res, 200, { ok: true, claimed: true, runId: null });
      }
      const runId = crypto.randomUUID();
      data.arcadeRuns.unshift({ runId, userId: user.id, startedAt: Date.now(), status: 'active' });
      data.arcadeRuns = data.arcadeRuns.filter((run) => Date.now() - run.startedAt < 86400000).slice(0, 1000);
      saveData();
      return json(res, 200, { ok: true, claimed: false, runId });
    } catch (error) {
      return json(res, 401, { ok: false, message: error.message });
    }
  }

  if (route === '/api/arcade/claim' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const user = telegramIdentity(body);
      if (arcadeRewardClaimed(user.id)) {
        return json(res, 200, { ok: true, activated: false, claimed: true, message: 'Награда уже была получена на этом аккаунте' });
      }
      const run = (data.arcadeRuns || []).find((item) => item.runId === String(body.runId || ''));
      const elapsed = run ? Date.now() - run.startedAt : 0;
      const score = Math.floor(Number(body.score) || 0);
      if (!run || Number(run.userId) !== user.id || run.status !== 'active') {
        return json(res, 400, { ok: false, message: 'Игровая сессия не найдена. Начните новый раунд.' });
      }
      if (score < 25 || elapsed < 20000 || elapsed > 900000) {
        return json(res, 400, { ok: false, message: 'Раунд ещё не подтверждён. Продолжайте играть.' });
      }
      run.status = 'claimed';
      run.score = score;
      run.claimedAt = Date.now();
      data.arcadeRewardClaims.unshift({ userId: user.id, runId: run.runId, score, at: Date.now() });
      const grant = grantTelegramPremium(user, 3, 'arcade:star-runner');
      return json(res, 200, { ok: true, activated: true, claimed: true, expiry: grant.expiry, message: '3 дня ZENOVA PRO активированы' });
    } catch (error) {
      return json(res, 401, { ok: false, message: error.message });
    }
  }

  /* ── Telegram Stars: инвойс «поддержать звёздами» (сумма 1 – ∞) ──
   * Требуется BOT_TOKEN в env того же бота, что открывает Mini App.
   * Валюта XTR — Telegram Stars, звёзды падают на баланс бота. */
  if (route === '/api/stars/invoice' && req.method === 'POST') {
    const body = await readBody(req);
    const amount = Math.max(1, Math.floor(Number(body.amount) || 0));
    const movieTitle = String(body.title || '').slice(0, 80);
    const botToken = process.env.BOT_TOKEN || '';
    if (!botToken) {
      return json(res, 500, { ok: false, message: 'BOT_TOKEN не настроен на сервере' });
    }
    if (amount < 1) {
      return json(res, 400, { ok: false, message: 'Минимальная сумма — 1 ⭐' });
    }
    try {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Поддержка ZENOVA ⭐',
          description: movieTitle
            ? `Спасибо за «${movieTitle}»! Ваша поддержка помогает проекту развиваться`
            : 'Спасибо! Ваша поддержка помогает проекту развиваться',
          payload: `stars_tip_${Date.now()}`,
          currency: 'XTR',
          prices: [{ label: 'Поддержка проекта', amount }],
        }),
      });
      const tg = await r.json();
      if (tg && tg.ok && tg.result) return json(res, 200, { ok: true, url: tg.result });
      return json(res, 500, { ok: false, message: (tg && tg.description) || 'Ошибка Telegram API' });
    } catch (e) {
      return json(res, 500, { ok: false, message: 'Ошибка соединения с Telegram' });
    }
  }

  if (route === '/api/premium/claim' && req.method === 'POST') {
    return json(res, 410, {
      ok: false, activated: false,
      message: 'Ручная активация отключена. Используйте счёт Telegram Stars.',
    });
  }

  /* ── Вход модератора по имени ── */
  if (route === '/api/mod/login' && req.method === 'POST') {
    const body = await readBody(req);
    const n = normalizeName(body.name);
    const isMod = data.moderators.some((m) => normalizeName(m) === n);
    return json(res, isMod ? 200 : 403, { ok: isMod, role: isMod ? 'moderator' : null });
  }

  /* ── Админ: полный конфиг ── */
  if (route === '/api/admin/config' && req.method === 'GET') {
    const token = req.headers['x-admin-token'];
    if (token !== ADMIN_TOKEN) return json(res, 403, { ok: false, error: 'Неверный токен' });
    return json(res, 200, { ok: true, ...data });
  }

  /* ── Админ/модератор: обновление конфига ── */
  if (route === '/api/admin/config' && req.method === 'POST') {
    const token = req.headers['x-admin-token'];
    const modUser = String(req.headers['x-mod-user'] || '');
    const isAdmin = token === ADMIN_TOKEN;
    const isMod = modUser && data.moderators.some((m) => normalizeName(m) === normalizeName(modUser));
    if (!isAdmin && !isMod) return json(res, 403, { ok: false, error: 'Доступ запрещён' });

    const body = await readBody(req);
    const by = isAdmin ? 'admin' : modUser;

    /* Модератору доступно не всё */
    if (!isAdmin) {
      if (body.action === 'grantPremium') {
        const days = Math.min(Number(body.days) || 30, 30);
        grantPremium({ name: body.name, username: body.name, days, by });
        return json(res, 200, { ok: true, message: '👑 Премиум выдан (' + days + ' дн.)' });
      }
      if ('announcement' in body) data.announcement = body.announcement;
      if ('adsEnabled' in body) data.adsEnabled = body.adsEnabled;
      saveData();
      return json(res, 200, { ok: true, message: '✅ Сохранено (права модератора)' });
    }

    /* Действия админа */
    if (body.action === 'grantPremium') {
      const grant = grantPremium({
        name: body.name, username: body.name,
        days: Number(body.days) || 30,
        forever: !!body.forever,
        by,
      });
      return json(res, 200, {
        ok: true,
        message: '👑 Премиум выдан: ' + grant.username + (grant.forever ? ' (бессрочно)' : ''),
        grant,
      });
    }
    if (body.action === 'revokePremium') {
      const before = data.premiumGrants.length;
      data.premiumGrants = data.premiumGrants.filter(
        (g) => normalizeName(g.username) !== normalizeName(body.name) &&
               normalizeName(g.name) !== normalizeName(body.name)
      );
      saveData();
      const removed = data.premiumGrants.length < before;
      return json(res, 200, {
        ok: removed,
        message: removed ? '🗑️ Премиум снят: ' + body.name : '⚠️ Пользователь не найден',
      });
    }
    if (body.action === 'addModerator') {
      const n = normalizeName(body.name);
      if (!n) return json(res, 400, { ok: false, error: 'Укажите имя' });
      if (!data.moderators.some((m) => normalizeName(m) === n)) {
        data.moderators.push(String(body.name).trim().replace(/^@/, ''));
        saveData();
      }
      return json(res, 200, { ok: true, message: '🛡 Модератор добавлен: ' + body.name });
    }
    if (body.action === 'removeModerator') {
      data.moderators = data.moderators.filter((m) => normalizeName(m) !== normalizeName(body.name));
      saveData();
      return json(res, 200, { ok: true, message: '🗑 Модератор удалён: ' + body.name });
    }
    if (body.action === 'approvePayment') {
      const p = data.payments[Number(body.index)];
      if (p) {
        p.status = 'paid';
        grantPremium({ name: p.username, username: p.username, days: p.plan === 'year' ? 365 : 30, by });
        saveData();
        return json(res, 200, { ok: true, message: '👑 Оплата подтверждена: ' + p.username });
      }
      return json(res, 404, { ok: false, error: 'Платёж не найден' });
    }
    if (body.action === 'removePayment') {
      data.payments.splice(Number(body.index), 1);
      saveData();
      return json(res, 200, { ok: true, message: '🗑 Платёж удалён' });
    }

    /* Простое обновление полей */
    const fields = ['adsEnabled', 'announcement', 'autoApprove', 'requisites', 'prices'];
    for (const f of fields) {
      if (f in body) data[f] = body[f];
    }
    saveData();
    return json(res, 200, { ok: true, message: '✅ Сохранено' });
  }

  return json(res, 404, { ok: false, error: 'Not found' });
}

/* ════════════ Прокси плееров ════════════ */

/* Белый список доменов — проксируем только видеоплееры */
const ALLOWED_HOSTS = [
  'kodik.info', 'kodik.cc', 'kodik.biz', 'kodikapi.com',
  'api.collaps.cc', 'collaps.cc',
  'videoframe.space', 'videoframe.us',
  'cdn.videocdn.tv', 'videocdn.tv',
  'turbovid.ru',
];

function isAllowed(host) {
  return ALLOWED_HOSTS.some((h) => host === h || host.endsWith('.' + h));
}

/** Переписать абсолютные ссылки в HTML на прокси-URL */
function rewriteHtml(body, baseUrl) {
  // https://host/path и //host/path → /?url=<encoded>
  body = body.replace(
    /(https?:)?\/\/([a-zA-Z0-9.-]+(?:\.[a-z]{2,})[^"'\s\\<>)]*)/g,
    (match) => {
      const abs = match.startsWith('//') ? 'https:' + match : match;
      try {
        const u = new URL(abs, baseUrl);
        if (!isAllowed(u.hostname)) return match;
        return '/?url=' + encodeURIComponent(abs);
      } catch { return match; }
    }
  );
  return body;
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  /* CORS preflight для API */
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token, X-Mod-User',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }

  /* API-маршруты (админка, премиум, конфиг) */
  if (reqUrl.pathname.startsWith('/api/')) {
    handleApi(req, res, reqUrl).catch((err) => {
      console.error('API error:', err);
      if (!res.headersSent) json(res, 500, { ok: false, error: 'Internal error' });
    });
    return;
  }

  const targetRaw = reqUrl.searchParams.get('url');

  if (!targetRaw) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('RU-Proxy работает. Использование: /?url=<encoded player url>');
  }

  let target;
  try { target = new URL(targetRaw); } catch {
    res.writeHead(400); return res.end('Bad url');
  }

  if (!/^https?:$/.test(target.protocol) || !isAllowed(target.hostname)) {
    res.writeHead(403);
    return res.end('Host not allowed');
  }

  const mod = target.protocol === 'http:' ? http : https;

  const upstreamReq = mod.request(target, {
    method: req.method === 'HEAD' ? 'GET' : req.method,
    headers: {
      'User-Agent': req.headers['user-agent'] ||
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      'Accept': '*/*',
      'Accept-Language': 'ru-RU,ru;q=0.9',
      'Referer': target.origin,
      ...(req.headers.range ? { Range: req.headers.range } : {}),
    },
    timeout: 15000,
  }, (upstreamRes) => {
    const headers = { ...upstreamRes.headers };

    /* Убираем запреты на встраивание */
    delete headers['x-frame-options'];
    delete headers['content-security-policy'];
    delete headers['content-security-policy-report-only'];
    delete headers['strict-transport-security'];

    /* Редиректы тоже заворачиваем в прокси */
    if (headers.location) {
      try {
        const abs = new URL(headers.location, target).toString();
        if (isAllowed(new URL(abs).hostname)) {
          headers.location = '/?url=' + encodeURIComponent(abs);
        }
      } catch {}
    }

    const ctype = headers['content-type'] || '';

    /* HTML — переписываем ссылки на прокси */
    if (ctype.includes('text/html')) {
      delete headers['content-length'];
      let body = '';
      upstreamRes.setEncoding('utf8');
      upstreamRes.on('data', (c) => { body += c; });
      upstreamRes.on('end', () => {
        body = rewriteHtml(body, target);
        headers['content-type'] = 'text/html; charset=utf-8';
        res.writeHead(upstreamRes.statusCode || 200, headers);
        res.end(body);
      });
      return;
    }

    /* Остальное (видео/JS/CSS) — стримим как есть */
    res.writeHead(upstreamRes.statusCode || 502, headers);
    upstreamRes.pipe(res);
  });

  upstreamReq.on('timeout', () => {
    upstreamReq.destroy();
    if (!res.headersSent) { res.writeHead(504); res.end('Upstream timeout'); }
  });

  upstreamReq.on('error', (err) => {
    console.error('Upstream error:', err.message);
    if (!res.headersSent) { res.writeHead(502); res.end('Upstream error'); }
  });

  req.pipe(upstreamReq);
});

function configureTelegramPayments() {
  if (!botToken()) {
    console.log('Telegram Stars: BOT_TOKEN не задан, оплата отключена');
    return;
  }
  const webhookUrl = String(process.env.TELEGRAM_WEBHOOK_URL || '').replace(/\/+$/, '');
  const webhookSecret = String(process.env.TELEGRAM_WEBHOOK_SECRET || '');
  if (webhookUrl && webhookSecret) {
    telegramApi('setWebhook', {
      url: `${webhookUrl}/api/telegram/webhook`,
      secret_token: webhookSecret,
      allowed_updates: ['message', 'pre_checkout_query'],
    }).then(() => console.log('Telegram Stars: webhook подключён'))
      .catch((error) => console.error('Telegram Stars webhook:', error.message));
    return;
  }
  if (process.env.TELEGRAM_PAYMENTS_POLLING !== '1') {
    console.log('Telegram Stars: задайте TELEGRAM_WEBHOOK_URL/SECRET или включите TELEGRAM_PAYMENTS_POLLING=1');
    return;
  }

  const poll = async () => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken()}/getUpdates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offset: Number(data.telegramUpdateOffset || 0),
          timeout: 25,
          allowed_updates: ['message', 'pre_checkout_query'],
        }),
        signal: AbortSignal.timeout(35000),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.description || 'getUpdates failed');
      for (const update of result.result) {
        await processTelegramUpdate(update);
        data.telegramUpdateOffset = Number(update.update_id) + 1;
      }
      if (result.result.length) saveData();
      setTimeout(poll, 0);
    } catch (error) {
      console.error('Telegram Stars polling:', error.message);
      setTimeout(poll, 5000);
    }
  };
  poll();
}

server.listen(PORT, () => {
  console.log(`🇷🇺 RU-Proxy + Mini Backend запущен на порту ${PORT}`);
  console.log(`Прокси:    http://localhost:${PORT}/?url=<encoded player url>`);
  console.log(`Конфиг:    http://localhost:${PORT}/api/config`);
  console.log(`Админ API: http://localhost:${PORT}/api/admin/config (X-Admin-Token)`);
  configureTelegramPayments();
});