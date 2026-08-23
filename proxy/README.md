# 🇷🇺 RU-Proxy

Прокси-сервер для обхода гео-блока российских видеоплееров (Kodik, Collaps,
VideoCDN, VideoFrame…). Нужен, чтобы пользователи приложения, сидящие в
Telegram через VPN (зарубежный IP), всё равно могли смотреть русские озвучки:
прокси запрашивает плеер со своего российского IP и отдаёт контент пользователю.

## Запуск на VPS (Node.js ≥ 18)

```bash
git clone <репозиторий> && cd proxy
PORT=8080 node server.js        # или через pm2:
pm2 start server.js --name ru-proxy
```

## Docker

```bash
docker build -t ru-proxy .
docker run -d -p 8080:8080 --name ru-proxy ru-proxy
```

## Nginx + HTTPS (рекомендуется)

Mini App работает по HTTPS, поэтому прокси тоже должен отдаваться по HTTPS:

```nginx
server {
    server_name ru-proxy.example.com;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_buffering off;          # важно для стриминга видео
        proxy_read_timeout 300s;
    }
    # ssl-сертификат через certbot: sudo certbot --nginx
}
```

## Подключение к приложению

1. **Админка** → «🌍 RU-Proxy» → вставить `https://ru-proxy.example.com` → Сохранить → Проверить.
2. Либо задать при сборке фронтенда: `VITE_RU_PROXY=https://ru-proxy.example.com npm run build`
   (адрес из админки имеет приоритет над env).

После этого у источников Kodik/Collaps/VideoCDN появится пометка «Через прокси»,
и они будут работать с любого IP.
