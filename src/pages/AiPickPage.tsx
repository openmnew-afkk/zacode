import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { smartDiscover, getRecommendations } from '../api/catalog';
import { useStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import type { Movie } from '../types';
import './AiPickPage.css';

/* ══════════════════════════════════════════════════════ */
/*  КиноИИ — умный подбор «что посмотреть»                 */
/* ══════════════════════════════════════════════════════ */

interface MoodDef { id: string; emoji: string; label: string; genres: number[]; hint: string }
const MOODS: MoodDef[] = [
  { id: 'fun',     emoji: '😄', label: 'Весёлое',       genres: [35],        hint: 'лёгкое и смешное' },
  { id: 'thrill',  emoji: '🤯', label: 'Захватывающее', genres: [28, 12, 53], hint: 'экшн, чтобы дух захватывал' },
  { id: 'smart',   emoji: '🕵️', label: 'Умное',         genres: [9648, 80],  hint: 'сюжет-головоломка' },
  { id: 'touch',   emoji: '🥹', label: 'Трогательное',  genres: [18, 10751], hint: 'драма, после которой думаешь' },
  { id: 'scary',   emoji: '😱', label: 'Страшное',      genres: [27, 53],    hint: 'мрачное и напряжённое' },
  { id: 'romance', emoji: '❤️', label: 'Романтика',     genres: [10749],     hint: 'про чувства и отношения' },
  { id: 'scifi',   emoji: '🚀', label: 'Фантастика',    genres: [878, 14],   hint: 'другие миры и технологии' },
  { id: 'family',  emoji: '🧸', label: 'Семейное',      genres: [10751, 16], hint: 'смотреть всей семьёй' },
];

interface TimeDef { id: string; label: string; min?: number; max?: number }
const TIMES: TimeDef[] = [
  { id: 'short',  label: '⏱ До 100 мин',    max: 100 },
  { id: 'medium', label: '🕐 Около 2 часов', min: 100, max: 130 },
  { id: 'long',   label: '🌙 Длинное, 2ч+', min: 130 },
  { id: 'any',    label: '♾ Любое' },
];

interface EraDef { id: string; label: string; from?: number; to?: number }
const ERAS: EraDef[] = [
  { id: 'new',     label: '🆕 Свежее · 2021+', from: 2021 },
  { id: 'tens',    label: '📀 Десятые',        from: 2010, to: 2019 },
  { id: 'classic', label: '🎩 Классика',                   to: 2005 },
  { id: 'any',     label: '🌍 Любая эпоха' },
];

interface Pick { movie: Movie; match: number; reason: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const numId = (id: string) => id.replace(/^(tv|movie)-/, '');

/** Скоринг кандидатов под вкус пользователя (избранное + история) */
function buildPicks(pool: Movie[], taste: Movie[], mood: MoodDef | null): Pick[] {
  const genreWeight = new Map<number, number>();
  for (const t of taste) (t.genre_ids || []).forEach((g) => genreWeight.set(g, (genreWeight.get(g) || 0) + 1));

  const scored = pool.map((m) => {
    const rating = m.vote_average || 0;
    let overlap = 0;
    let tasteRef: Movie | null = null;
    for (const g of m.genre_ids || []) {
      if (genreWeight.has(g)) {
        overlap++;
        if (!tasteRef) tasteRef = taste.find((t) => t.genre_ids?.includes(g)) || null;
      }
    }
    const score = rating * 2 + overlap * 2.5 + Math.min((m.popularity || 0) / 300, 2);
    return { m, rating, overlap, tasteRef, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const out: Pick[] = [];
  for (const s of scored) {
    if (out.length >= 6) break;
    if (s.rating < 6.2) continue;
    if (seen.has(s.m.id)) continue;
    seen.add(s.m.id);

    const parts: string[] = [];
    if (s.tasteRef) parts.push(`похоже на «${s.tasteRef.title}» из вашего списка`);
    else if (s.overlap >= 2) parts.push('жанр — прямо ваш вкус');
    else if (mood) parts.push(mood.hint);
    if (s.rating >= 7.6) parts.push(`отличный рейтинг ★${s.rating.toFixed(1)}`);

    const match = Math.max(55, Math.min(98, Math.round(60 + s.overlap * 7 + (s.rating - 6) * 5 + Math.random() * 5)));
    out.push({ movie: s.m, match, reason: parts.slice(0, 2).join(' · ') });
  }
  return out;
}

type Stage = 'quiz' | 'thinking' | 'results' | 'empty';

const AiPickPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { favorites, watchHistory } = useStore();

  const [mood, setMood] = useState<MoodDef | null>(null);
  const [time, setTime] = useState<TimeDef | null>(null);
  const [era, setEra] = useState<EraDef | null>(null);
  const [stage, setStage] = useState<Stage>('quiz');
  const [picks, setPicks] = useState<Pick[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* Автоскролл чата вниз */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [stage, mood, time, era]);

  const runSearch = async (selMood: MoodDef, selTime: TimeDef, selEra: EraDef) => {
    setStage('thinking');
    haptic('medium');

    const taste = [...favorites, ...watchHistory.map((h) => h.movie)];
    const seenIds = new Set(taste.map((m) => numId(m.id)));

    /* Кандидаты по фильтрам + персональные рекомендации от последнего просмотра */
    const last = watchHistory[0]?.movie;
    const recP = last
      ? getRecommendations(numId(last.id), last.id.startsWith('tv') ? 'tv' : 'movie').catch(() => [] as Movie[])
      : Promise.resolve([] as Movie[]);

    const [movies, tvs, recs] = await Promise.all([
      smartDiscover({
        mediaType: 'movie',
        genres: selMood.genres,
        minRuntime: selTime.min,
        maxRuntime: selTime.max,
        yearFrom: selEra.from,
        yearTo: selEra.to,
      }),
      smartDiscover({
        mediaType: 'tv',
        genres: selMood.genres,
        yearFrom: selEra.from,
        yearTo: selEra.to,
      }),
      recP,
      sleep(1500), // эффект «размышления»
    ]);

    /* Дедупликация + исключаем уже виденное */
    const poolMap = new Map<string, Movie>();
    for (const m of [...recs, ...movies, ...tvs]) {
      if (!seenIds.has(numId(m.id))) poolMap.set(m.id, m);
    }
    const result = buildPicks([...poolMap.values()], taste, selMood);
    setPicks(result);
    setStage(result.length ? 'results' : 'empty');
  };

  const pickMood = (m: MoodDef) => { haptic('light'); setMood(m); };
  const pickTime = (t: TimeDef) => { haptic('light'); setTime(t); };
  const pickEra = (e: EraDef) => {
    haptic('light');
    setEra(e);
    if (mood && time) runSearch(mood, time, e); // третий ответ — сразу запускаем
  };

  const surprise = () => {
    haptic('light');
    const m = MOODS[Math.floor(Math.random() * MOODS.length)];
    const t = TIMES[Math.floor(Math.random() * TIMES.length)];
    const e = ERAS[Math.floor(Math.random() * ERAS.length)];
    setMood(m); setTime(t); setEra(e);
    runSearch(m, t, e);
  };

  const reset = () => {
    haptic('light');
    setMood(null); setTime(null); setEra(null);
    setPicks([]); setStage('quiz');
  };

  const again = () => {
    if (mood && time && era) runSearch(mood, time, era);
  };

  /* ── Экраны результатов ── */
  if (stage !== 'quiz') {
    return (
      <div className="aip page">
        <header className="aip-header">
          <div className="aip-header__avatar">✦</div>
          <div className="aip-header__info">
            <h1 className="aip-header__title">КиноИИ</h1>
            <p className="aip-header__sub">{mood?.emoji} {mood?.label} · {time?.label} · {era?.label}</p>
          </div>
          <button className="aip-icon-btn" onClick={reset} aria-label="Заново">↺</button>
        </header>

        {stage === 'thinking' && (
          <div className="aip-chat">
            <div className="aip-bubble aip-bubble--ai">
              <span className="aip-dots"><i /><i /><i /></span>
              Изучаю ваш вкус и перебираю каталог…
            </div>
          </div>
        )}

        {stage === 'empty' && (
          <div className="aip-chat">
            <div className="aip-bubble aip-bubble--ai">
              Хм, по такому запросу ничего достойного не нашёл 😔
              <div style={{ marginTop: 12 }}>
                <button className="aip-btn" onClick={reset}>↺ Настроить заново</button>
              </div>
            </div>
          </div>
        )}

        {stage === 'results' && (
          <>
            <div className="aip-chat">
              <div className="aip-bubble aip-bubble--ai">
                Готово! Совпадение считаю по твоим избранным и истории просмотров 👇
              </div>
            </div>
            <div className="aip-list">
              {picks.map((p) => (
                <div key={p.movie.id} className="aip-card" onClick={() => navigate(`/movie/${p.movie.id}`)}>
                  <img className="aip-card__poster" src={p.movie.poster_path} alt="" loading="lazy" />
                  <div className="aip-card__body">
                    <span className="aip-card__match">{p.match}%</span>
                    <h3 className="aip-card__title">{p.movie.title}</h3>
                    <p className="aip-card__meta">
                      {p.movie.release_date?.slice(0, 4)}
                      {p.movie.is_serial ? ' · сериал' : ''}
                      {p.movie.vote_average > 0 ? ` · ★ ${p.movie.vote_average.toFixed(1)}` : ''}
                    </p>
                    {p.reason && <p className="aip-card__reason">💡 {p.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="aip-actions">
              <button className="aip-btn" onClick={again}>🔄 Другие варианты</button>
              <button className="aip-btn aip-btn--ghost" onClick={reset}>✨ Новое настроение</button>
            </div>
          </>
        )}
        <div ref={bottomRef} />
      </div>
    );
  }

  /* ── Викторина ── */
  return (
    <div className="aip page">
      <header className="aip-header">
        <div className="aip-header__avatar">✦</div>
        <div className="aip-header__info">
          <h1 className="aip-header__title">КиноИИ</h1>
          <p className="aip-header__sub">Подберу кино под настроение</p>
        </div>
        <button className="aip-surprise" onClick={surprise}>🎲 Удиви меня</button>
      </header>

      <div className="aip-chat">
        <div className="aip-bubble aip-bubble--ai">
          Привет! Я КиноИИ 🤖 Ответь на три вопроса — и я найду идеальный фильм или сериал.
        </div>

        {!mood ? (
          <>
            <div className="aip-bubble aip-bubble--ai">Какое настроение ищешь?</div>
            <div className="aip-chips">
              {MOODS.map((m) => (
                <button key={m.id} className="aip-chip" onClick={() => pickMood(m)}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="aip-bubble aip-bubble--user">{mood.emoji} {mood.label}</div>
        )}

        {mood && (!time ? (
          <>
            <div className="aip-bubble aip-bubble--ai">Сколько есть времени?</div>
            <div className="aip-chips">
              {TIMES.map((t) => (
                <button key={t.id} className="aip-chip" onClick={() => pickTime(t)}>{t.label}</button>
              ))}
            </div>
          </>
        ) : (
          <div className="aip-bubble aip-bubble--user">{time.label}</div>
        ))}

        {mood && time && (!era ? (
          <>
            <div className="aip-bubble aip-bubble--ai">И последний вопрос: какая эпоха?</div>
            <div className="aip-chips">
              {ERAS.map((e) => (
                <button key={e.id} className="aip-chip" onClick={() => pickEra(e)}>{e.label}</button>
              ))}
            </div>
          </>
        ) : (
          <div className="aip-bubble aip-bubble--user">{era.label}</div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default AiPickPage;
