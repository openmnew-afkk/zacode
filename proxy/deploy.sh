#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# RU-Proxy + Mini Backend — авто-установка на российский VPS
#
# Использование (на чистом Ubuntu 22/24 VPS от root):
#   bash deploy.sh
#
# Что делает:
#   1. Ставит Node.js 20 + pm2
#   2. Запускает сервер на порту 8080
#   3. Настраивает nginx + бесплатный HTTPS (certbot), если указан домен
#
# После установки вставьте адрес в приложении:
#   Админка → 🌍 RU-Proxy и 🖥️ API-сервер → https://<домен или IP>
# ═══════════════════════════════════════════════════════════
set -e

DOMAIN="${1:-}"           # ./deploy.sh kino.example.com — опционально
ADMIN_TOKEN="${ADMIN_TOKEN:-Kodik987412365}"
PORT="${PORT:-8080}"

echo "🇷🇺 Установка RU-Proxy + Mini Backend…"

# Node.js 20
if ! command -v node >/dev/null 2>&1; then
  echo "📦 Устанавливаю Node.js 20…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v

# pm2
if ! command -v pm2 >/dev/null 2>&1; then
  echo "📦 Устанавливаю pm2…"
  npm install -g pm2
fi

# Сервер
cd "$(dirname "$0")"
PORT=$PORT ADMIN_TOKEN=$ADMIN_TOKEN pm2 delete ru-proxy 2>/dev/null || true
PORT=$PORT ADMIN_TOKEN=$ADMIN_TOKEN pm2 start server.js --name ru-proxy
pm2 save
pm2 startup -u root 2>/dev/null | tail -1 | bash || true

# nginx + HTTPS (только если указан домен)
if [ -n "$DOMAIN" ]; then
  echo "🌐 Настраиваю nginx для $DOMAIN…"
  apt-get update -y && apt-get install -y nginx certbot python3-certbot-nginx
  cat > /etc/nginx/sites-available/ru-proxy <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_buffering off;          # важно для стриминга видео
        proxy_read_timeout 300s;
        proxy_http_version 1.1;
    }
}
NGINX
  ln -sf /etc/nginx/sites-available/ru-proxy /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
  echo "🔒 Выпускаю HTTPS-сертификат…"
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@$DOMAIN || \
    echo "⚠️ Certbot не сработал — проверьте DNS-запись домена"
  echo ""
  echo "✅ Готово! Адрес для админки: https://$DOMAIN"
else
  IP=$(curl -s --max-time 5 ifconfig.me || echo '<IP_СЕРВЕРА>')
  echo ""
  echo "✅ Готово! Сервер работает на порту $PORT"
  echo "   Адрес для админки: http://$IP:$PORT"
  echo "   ⚠️ Telegram Mini App требует HTTPS — укажите домен:"
  echo "      bash deploy.sh ваш-домен.ру"
fi
echo ""
echo "Токен админа (ADMIN_TOKEN): $ADMIN_TOKEN"