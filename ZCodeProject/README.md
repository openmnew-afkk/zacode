# TeleCinema 🎬

Telegram Mini App для просмотра фильмов и сериалов онлайн.

## Стек
- **React 18** + TypeScript + Vite
- **React Router DOM** — навигация
- **Zustand** — хранилище (избранное, история)
- **Axios** — запросы к API
- **poiskkino.dev** (бывший kinopoisk.dev) — каталог, поиск, метаданные
- **Kinobase / Embed-плеер** — видеопросмотр (настраиваемый источник)
- **Vercel Serverless** — прокси к API

## Быстрый старт

```bash
cp .env.example .env
# Добавьте KINOPOISK_API_KEY в .env (или введите в «Профиль → Настройки → Каталог»)

npm install
npm run dev
```

Приложение запустится на http://localhost:5173

## API-ключ poiskkino.dev (обязательно)

1. Перейдите на [poiskkino.dev](https://poiskkino.dev) (бывший kinopoisk.dev)
2. Получите **бесплатный API-ключ** (X-API-KEY)
3. Задайте его одним из двух способов:
   - **Серверная переменная** `KINOPOISK_API_KEY` (рекомендуется — ключ скрыт от клиента)
   - **В приложении**: откройте «Профиль → Настройки → Каталог» и вставьте ключ

## Плеер (настройка)

По умолчанию плеер использует **kinobase.org** — фильм открывается на их сайте.
Вы можете указать свой домен-плеер в «Профиль → Настройки → Плеер» по шаблону:

```
https://ваш-сайт/film/{ID}
```

Где `{ID}` заменяется на ID Кинопоиска фильма.
YouTube-поиск всегда доступен как запасной вариант.

## Деплой на Vercel

```bash
npx vercel --prod
```

Или подключите репозиторий в [vercel.com](https://vercel.com):
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `KINOPOISK_API_KEY` (server-only)

## Подключение к Telegram

1. Задеплойте на Vercel
2. Откройте [@BotFather](https://t.me/BotFather)
3. Отправьте `/newapp` и укажите URL Vercel

## Структура

```
src/
├── api/          — Клиент к serverless-прокси
├── components/   — MovieCard, TabBar, VideoPlayer, SearchBar и др.
├── pages/        — Home, Search, Favorites, Profile, MovieDetail
├── hooks/        — useTelegram
├── store/        — Zustand (localStorage)
├── styles/       — CSS Glass Aurora
└── types/        — TypeScript интерфейсы

api/              — Vercel serverless-функции
├── _lib/         — poiskkino-клиент + common
├── catalog.ts    — Список, поиск, детали
└── player.ts     — Embed-плеер + YouTube фолбэк
```
