/* ═══════════════════════════════════════════════════════════
 * RU-Proxy — обход гео-блока российских видеоплееров
 *
 * Проблема: Kodik, Collaps, VideoCDN и др. работают только с
 * российских IP. Пользователи Telegram Mini App часто сидят
 * через VPN (зарубежный IP) → плееры не грузятся.
 *
 * Решение: этот прокси разворачивается на российском VPS.
 * Он запрашивает плеер СО СВОЕГО российского IP и отдаёт
 * результат пользователю, вырезая заголовки, запрещающие iframe.
 *
 * Запуск:  node server.js   (PORT из env или 8080)
 * Docker:  см. README.md
 * ═══════════════════════════════════════════════════════════ */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 8080;

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
  console.log(`🇷🇺 RU-Proxy запущен на порту ${PORT}`);
  console.log(`Использование: http://localhost:${PORT}/?url=<encoded player url>`);
});