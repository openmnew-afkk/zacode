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
const { URL } = require('url');

const PORT = process.env.PORT || 8080;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'Kodik987412365';
const DATA_FILE = path.join(__dirname, 'data.json');

/* ════════════ Хранилище (файл data.json) ════════════ */

const DEFAULT_DATA = {
  adsEnabled: true,
  announcement: '',
  autoApprove: true, // премиум активируется сразу после оплаты
  requisites: { card: '', sbp: '', crypto: '', note: '' },
  prices: { month: 199, monthFirst: 99, year: 2400, yearFirst: 1600 },
  /* Выданный премиум: { name, username, expiry, forever, by, at } */
  premiumGrants: [],
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

  /* ── Заявка на оплату → авто-выдача премиума ── */
  if (route === '/api/premium/claim' && req.method === 'POST') {
    const body = await readBody(req);
    const username = String(body.username || '').trim().replace(/^@/, '');
    if (!username) return json(res, 400, { ok: false, error: 'Укажите имя или @username' });

    const plan = body.plan === 'month' ? 'month' : 'year';
    const days = plan === 'year' ? 365 : 30;

    if (data.autoApprove) {
      grantPremium({ name: username, username, days, by: 'payment' });
      data.payments.unshift({
        username, plan, txn: String(body.txn || '').slice(0, 60),
        status: 'paid', at: Date.now(), auto: true,
      });
      data.payments = data.payments.slice(0, 200);
      saveData();
      const grant = findGrant(username);
      return json(res, 200, {
        ok: true, activated: true, expiry: grant ? grant.expiry : null,
        message: '👑 Премиум активирован! Спасибо за оплату.',
      });
    }

    /* Ручное подтверждение админом */
    data.payments.unshift({
      username, plan, txn: String(body.txn || '').slice(0, 60),
      status: 'pending', at: Date.now(), auto: false,
    });
    data.payments = data.payments.slice(0, 200);
    saveData();
    return json(res, 200, {
      ok: true, activated: false,
      message: '✅ Заявка отправлена, ожидайте подтверждения',
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

server.listen(PORT, () => {
  console.log(`🇷🇺 RU-Proxy + Mini Backend запущен на порту ${PORT}`);
  console.log(`Прокси:    http://localhost:${PORT}/?url=<encoded player url>`);
  console.log(`Конфиг:    http://localhost:${PORT}/api/config`);
  console.log(`Админ API: http://localhost:${PORT}/api/admin/config (X-Admin-Token)`);
});