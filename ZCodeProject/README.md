# TeleCinema 🎬

Telegram Mini App для просмотра фильмов и сериалов.

## Стек
- **React 18** + TypeScript + Vite
- **React Router DOM** — навигация
- **Zustand** — хранилище (избранное, история)
- **Axios** — запросы к API
- **TMDB API** — данные о фильмах
- **Kodik API** — видеоплеер

## Быстрый старт

```bash
cp .env.example .env
# Добавьте VITE_TMDB_API_KEY в .env

npm install
npm run dev
```

Приложение запустится на http://localhost:5173

## Получить TMDB API ключ

1. Зарегистрируйтесь на [themoviedb.org](https://www.themoviedb.org)
2. Перейдите в [Настройки → API](https://www.themoviedb.org/settings/api)
3. Скопируйте **API Key (v3 auth)**

## Деплой на Vercel

```bash
npx vercel --prod
```

Или подключите репозиторий в [vercel.com](https://vercel.com):
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_TMDB_API_KEY`

## Подключение к Telegram

1. Задеплойте на Vercel
2. Откройте [@BotFather](https://t.me/BotFather)
3. Отправьте `/newapp` и укажите URL Vercel

## Структура

```
src/
├── api/          — TMDB и Kodik клиенты
├── components/   — MovieCard, TabBar, VideoPlayer и др.
├── pages/        — Home, Search, Favorites, Profile, MovieDetail
├── hooks/        — useTelegram
├── store/        — Zustand (localStorage)
├── styles/       — Глобальные CSS переменные
└── types/        — TypeScript интерфейсы
```
