# TeleCinema 🎬

Telegram Mini App для просмотра фильмов и сериалов онлайн.

## Стек
- **React 18** + TypeScript + Vite
- **React Router DOM** — навигация
- **Zustand** — хранилище (избранное, история)
- **OMDb API** — каталог, поиск, метаданные (бесплатно, без регистрации)
- **YouTube / embed-плеер** — видеопросмотр (настраиваемый)
- **Vercel Serverless** — прокси к API

## Быстрый старт

```bash
npm install
npm run dev
```

Приложение запустится на http://localhost:5173

Каталог работает **сразу без токенов**. Видео — по умолчанию YouTube (трейлеры/поиск), либо настраивается свой плеер.

## Плеер (настройка)

В «Профиль → Настройки → Плеер» можно указать свой embed-адрес по шаблону:

```
https://ваш-сайт/film/{ID}
```

Где `{ID}` — IMDb ID фильма (например `tt0133093`).
По умолчанию — YouTube поиск по названию фильма (всегда работает).

## Деплой на Vercel

```bash
npx vercel --prod
```

Или подключите репозиторий в [vercel.com](https://vercel.com):
- Build Command: `npm run build`
- Output Directory: `dist`
- (Опционально) `OMDB_API_KEY` — свой ключ OMDb, если нужно больше лимитов

## Структура

```
src/
├── api/          — Клиент к serverless-прокси
├── components/   — MovieCard, TabBar, VideoPlayer, SplashPage и др.
├── pages/        — Home, Search, Favorites, Profile, MovieDetail
├── hooks/        — useTelegram
├── store/        — Zustand (localStorage)
├── styles/       — CSS Glass Aurora
└── types/        — TypeScript интерфейсы

api/              — Vercel serverless-функции
├── _lib/         — OMDb клиент + common
├── catalog.ts    — Поиск, каталог, детали
└── player.ts     — Плеер
```
