# TeleCinema 🎬

Telegram Mini App для просмотра фильмов и сериалов онлайн.

## Стек
- **React 18** + TypeScript + Vite
- **React Router DOM** — навигация
- **Zustand** — хранилище (избранное, история)
- **Axios** — запросы к API
- **VideoCDN** — каталог фильмов и видеоплеер
- **Vercel Serverless** — прокси к VideoCDN (решает CORS)

## Быстрый старт

```bash
cp .env.example .env
# Добавьте VIDEOCDN_TOKEN в .env (или введите токен внутри приложения в «Профиль → Настройки → Источники»)

npm install
npm run dev
```

Приложение запустится на http://localhost:5173

## Токен VideoCDN

1. Зарегистрируйтесь на [videocdn.tv](https://videocdn.tv)
2. Получите API-токен в личном кабинете
3. Задайте его одним из двух способов:
   - **Серверная переменная** `VIDEOCDN_TOKEN` (рекомендуется для продакшена — токен скрыт от клиента)
   - **В приложении**: откройте «Профиль → Настройки → Источники» и введите токен (хранится в localStorage)

## Деплой на Vercel

```bash
npx vercel --prod
```

Или подключите репозиторий в [vercel.com](https://vercel.com):
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VIDEOCDN_TOKEN` (server-only)

## Подключение к Telegram

1. Задеплойте на Vercel
2. Откройте [@BotFather](https://t.me/BotFather)
3. Отправьте `/newapp` и укажите URL Vercel

## Структура

```
src/
├── api/          — Клиент к serverless-прокси VideoCDN
├── components/   — MovieCard, TabBar, VideoPlayer, SearchBar и др.
├── pages/        — Home, Search, Favorites, Profile, MovieDetail
├── hooks/        — useTelegram
├── store/        — Zustand (localStorage)
├── styles/       — Глобальные CSS-переменные (Glass Aurora)
└── types/        — TypeScript интерфейсы

api/              — Vercel serverless-функции
├── _lib/         — Общий клиент VideoCDN + нормализация
├── catalog.ts    — Список / поиск фильмов
├── movie.ts      — Детали фильма
└── player.ts     — Ссылка на плеер
```
