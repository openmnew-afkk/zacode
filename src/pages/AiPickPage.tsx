import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { smartDiscover, getRecommendations } from '../api/catalog';
import { useStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import type { Movie } from '../types';
import VeloraAiEmblem from '../components/VeloraAiEmblem';
import './AiPickPage.css';

/* ══════════════════════════════════════════════════════ */
/*  КиноИИ — умный подбор «что посмотреть»                 */
/* ══════════════════════════════════════════════════════ */

interface MoodDef { id: string; label: string; genres: number[]; hint: string }
const MOODS: MoodDef[] = [
  { id: 'fun',     label: 'Весёлое & Лёгкое',       genres: [35],        hint: 'лёгкое и смешное' },
  { id: 'thrill',  label: 'Захватывающий экшн',     genres: [28, 12, 53], hint: 'динамичный сюжет и драйв' },
  { id: 'smart',   label: 'Головоломка & Детектив', genres: [9648, 80],  hint: 'сюжет-загадка с неожиданным финалом' },
  { id: 'touch',   label: 'Глубокая драма',         genres: [18, 10751], hint: 'эмоциональная и сильная история' },
  { id: 'scary',   label: 'Хоррор & Триллер',       genres: [27, 53],    hint: 'напряжённое и леденящее' },
  { id: 'romance', label: 'Чувства & Романтика',     genres: [10749],     hint: 'история о любви и отношениях' },
  { id: 'scifi',   label: 'Фантастика & Sci-Fi',    genres: [878, 14],   hint: 'другие миры и технологии будущего' },
  { id: 'family',  label: 'Семейное кино',          genres: [10751, 16], hint: 'уютный вечер для всей семьи' },
];

interface TimeDef { id: string; label: string; min?: number; max?: number }
const TIMES: TimeDef[] = [
  { id: 'short',  label: 'До 100 минут',      max: 100 },
  { id: 'medium', label: 'Около 2 часов',     min: 100, max: 130 },
  { id: 'long',   label: 'Длинное · от 2ч+',  min: 130 },
  { id: 'any',    label: 'Любой хронометраж' },
];

interface EraDef { id: string; label: string; from?: number; to?: number }
const ERAS: EraDef[] = [
  { id: 'new',     label: 'Новинки · 2021+',   from: 2021 },
  { id: 'tens',    label: 'Хиты 2010-х',        from: 2010, to: 2019 },
  { id: 'classic', label: 'Культовая классика',            to: 2005 },
  { id: 'any',     label: 'Любая эпоха' },
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
    if (s.tasteRef) parts.push(`похоже на «${s.tasteRef.title}» из вашей библиотеки`);
    else if (s.overlap >= 2) parts.push('идеально под ваш любимый жанр');
    else if (mood) parts.push(mood.hint);
    if (s.rating >= 7.6) parts.push(`высокий рейтинг ★${s.rating.toFixed(1)}`);

    const match = Math.max(75, Math.min(99, Math.round(72 + s.overlap * 6 + (s.rating - 6) * 4.5 + Math.random() * 4)));
    out.push({ movie: s.m, match, reason: parts.slice(0, 2).join(' · ') });
  }
  return out;
}

type Stage = 'quiz' | 'thinking' | 'results' | 'empty';

const AiPickPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { favorites, watchHistory, isFavorite, addFavorite, removeFavorite } = useStore();

  const [mood, setMood] = useState<MoodDef | null>(null);
  const [time, setTime] = useState<TimeDef | null>(null);
  const [era, setEra] = useState<EraDef | null>(null);
  const [stage, setStage] = useState<Stage>('quiz');
  const [picks, setPicks] = useState<Pick[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* Автоскролл: на этапе результатов — вверх к первому фильму, в чате — к вопросу */
  useEffect(() => {
    if (stage === 'results') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
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
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
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
          <VeloraAiEmblem size="md" />
          <div className="aip-header__info">
            <h1 className="aip-header__title">Velora AI</h1>
            <p className="aip-header__sub">{mood?.label} · {time?.label} · {era?.label}</p>
          </div>
          <button className="aip-icon-btn" onClick={reset} aria-label="Заново" title="Заново">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" />
            </svg>
          </button>
        </header>

        {stage === 'thinking' && (
          <div className="aip-chat">
            <div className="aip-bubble aip-bubble--ai">
              <span className="aip-dots"><i /><i /><i /></span>
              Velora AI анализирует ваши предпочтения и сканирует фильмотеку…
            </div>
          </div>
        )}

        {stage === 'empty' && (
          <div className="aip-chat">
            <div className="aip-bubble aip-bubble--ai">
              По заданным параметрам ничего не найдено. Попробуем с другими фильтрами?
              <div style={{ marginTop: 14 }}>
                <button className="aip-btn" onClick={reset}>Попробовать снова</button>
              </div>
            </div>
          </div>
        )}

        {stage === 'results' && (
          <>
            <div className="aip-chat">
              <div className="aip-bubble aip-bubble--ai">
                Готово! Подборка рассчитана нейросетью на основе вашего персонального вкуса:
              </div>
            </div>
            <div className="aip-list">
              {picks.map((p) => (
                <div key={p.movie.id} className="aip-card" onClick={() => navigate(`/movie/${p.movie.id}`)}>
                  <div
                    className="aip-card__cover"
                    style={{ backgroundImage: `url(${p.movie.backdrop_path || p.movie.poster_path})` }}
                  >
                    <div className="aip-card__veil" />
                    <div className="aip-card__top-badges">
                      <span className="aip-card__type">{p.movie.is_serial ? 'Сериал' : 'Фильм'}</span>
                      <span className="aip-card__match">{p.match}% совпадение</span>
                    </div>
                    <div className="aip-card__cover-bottom">
                      <h3 className="aip-card__title">{p.movie.title}</h3>
                      <p className="aip-card__meta">
                        {p.movie.release_date?.slice(0, 4)}
                        {p.movie.vote_average > 0 ? ` · ★ ${p.movie.vote_average.toFixed(1)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="aip-card__foot">
                    {p.reason && (
                      <div className="aip-card__reason-box">
                        <span className="aip-card__reason-spark">✦</span>
                        <p className="aip-card__reason">{p.reason}</p>
                      </div>
                    )}
                    <div className="aip-card__actions">
                      <button
                        className="aip-card__watch"
                        onClick={(e) => { e.stopPropagation(); haptic('medium'); navigate(`/movie/${p.movie.id}`); }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
                        Смотреть
                      </button>
                      <button
                        className={`aip-card__fav ${isFavorite(p.movie.id) ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          haptic('light');
                          if (isFavorite(p.movie.id)) removeFavorite(p.movie.id);
                          else addFavorite(p.movie);
                        }}
                        aria-label="В избранное"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite(p.movie.id) ? '#ec4899' : 'none'} stroke={isFavorite(p.movie.id) ? '#ec4899' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="aip-actions">
              <button className="aip-btn" onClick={again}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Другие варианты
              </button>
              <button className="aip-btn aip-btn--ghost" onClick={reset}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Новый запрос
              </button>
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
        <VeloraAiEmblem size="md" />
        <div className="aip-header__info">
          <h1 className="aip-header__title">Velora AI</h1>
          <p className="aip-header__sub">Нейросетевой куратор кино</p>
        </div>
        <button className="aip-surprise" onClick={surprise}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
            <path d="M16 3h5v5" /><path d="M4 20L21 3" />
            <path d="M21 16v5h-5" /><path d="M15 15l6 6" /><path d="M4 4l5 5" />
          </svg>
          Удиви меня
        </button>
      </header>

      <div className="aip-chat">
        <div className="aip-bubble aip-bubble--ai">
          Привет! Я <strong>Velora AI</strong> ✦ Персональный киноинтеллект. Ответьте на три коротких вопроса — и я мгновенно подберу идеальный фильм или сериал.
        </div>

        {!mood ? (
          <>
            <div className="aip-bubble aip-bubble--ai">Какое настроение сегодня?</div>
            <div className="aip-chips">
              {MOODS.map((m) => (
                <button key={m.id} className="aip-chip" onClick={() => pickMood(m)}>
                  {m.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="aip-bubble aip-bubble--user">{mood.label}</div>
        )}

        {mood && !time && (
          <>
            <div className="aip-bubble aip-bubble--ai">Сколько у вас времени?</div>
            <div className="aip-chips">
              {TIMES.map((t) => (
                <button key={t.id} className="aip-chip" onClick={() => pickTime(t)}>{t.label}</button>
              ))}
            </div>
          </>
        )}
        {mood && time && (
          <div className="aip-bubble aip-bubble--user">{time.label}</div>
        )}

        {mood && time && !era && (
          <>
            <div className="aip-bubble aip-bubble--ai">И последний штрих: предпочтительная эпоха?</div>
            <div className="aip-chips">
              {ERAS.map((e) => (
                <button key={e.id} className="aip-chip" onClick={() => pickEra(e)}>{e.label}</button>
              ))}
            </div>
          </>
        )}
        {mood && time && era && (
          <div className="aip-bubble aip-bubble--user">{era.label}</div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default AiPickPage;
