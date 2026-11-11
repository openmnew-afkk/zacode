import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { smartDiscover, getRecommendations, searchMovies } from '../api/catalog';
import type { SmartDiscoverOpts } from '../api/catalog';
import { useStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import type { Movie } from '../types';
import { getStoredSeason } from '../services/seasons';
import { SynthaxAiStudio } from '../components/SynthaxAiStudio';
import YandexGlowInput from '../components/YandexGlowInput';
import './AiPickPage.css';

/* ═══════════════════════════════════════════════════════════════════════════
 *  ✦ ОРАКУЛ — персональный кино-подбор ZENOVA
 *  Нажал на настроение → меню уезжает → карточки выскакивают колодой.
 *  Свайп вправо — сохранить, влево — дальше. Сразу видно, что подобрал Оракул.
 * ═══════════════════════════════════════════════════════════════════════════ */

interface Mood {
  id: string;
  icon: string;
  label: string;
  hint: string;
  query: string;
  genres: number[];
  tint: string;
}

const MOODS: Mood[] = [
  { id: 'mind', icon: '🧠', label: 'Взрыв мозга', hint: 'Твисты и нелинейный сюжет', query: 'закрученный триллер', genres: [9648, 53], tint: '#a78bfa' },
  { id: 'space', icon: '🌌', label: 'Космос', hint: 'Другие миры и будущее', query: 'космос фантастика', genres: [878], tint: '#38bdf8' },
  { id: 'noir', icon: '🕯️', label: 'Тёмный нуар', hint: 'Мрачные расследования', query: 'детектив расследование', genres: [80, 9648], tint: '#f59e0b' },
  { id: 'cozy', icon: '🍿', label: 'Уютный вечер', hint: 'Легко и с улыбкой', query: 'комедия', genres: [35], tint: '#fb7185' },
  { id: 'adrenaline', icon: '⚡', label: 'Адреналин', hint: 'Погони и экшн', query: 'боевик', genres: [28], tint: '#f97316' },
  { id: 'tears', icon: '💔', label: 'До мурашек', hint: 'Сильная драма', query: 'драма', genres: [18, 10749], tint: '#f472b6' },
  { id: 'fear', icon: '🩸', label: 'Страшно', hint: 'Хоррор на ночь', query: 'ужасы', genres: [27], tint: '#ef4444' },
  { id: 'magic', icon: '🪄', label: 'Магия', hint: 'Фэнтези и сказки', query: 'фэнтези', genres: [14, 12], tint: '#34d399' },
];

type Company = 'solo' | 'date' | 'friends' | 'family';
const COMPANY: { id: Company; icon: string; label: string }[] = [
  { id: 'solo', icon: '🎧', label: 'Один' },
  { id: 'date', icon: '🥂', label: 'Вдвоём' },
  { id: 'friends', icon: '🎉', label: 'Компания' },
  { id: 'family', icon: '🏠', label: 'Семья' },
];

type Format = 'movie' | 'tv' | 'all';
type Length = 'any' | 'short' | 'epic';

/* Жанры TMDB для сериалов отличаются — переводим */
const toTvGenre = (g: number): number | null => {
  const map: Record<number, number | null> = {
    878: 10765, 14: 10765, 28: 10759, 12: 10759, 53: 9648, 27: 9648, 10749: 18,
  };
  return g in map ? map[g] : g;
};

interface Pick {
  movie: Movie;
  match: number;
  reason: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cleanId = (id: string) => id.replace(/^(tv|movie)-/, '');

const SCAN_LINES = ['Читаю ваше настроение', 'Сверяю с историей просмотров', 'Отбираю лучшее'];

const AiPickPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { favorites, watchHistory, isFavorite, addFavorite } = useStore();
  const isWinter = getStoredSeason().season.id === 'winter';
  const maskSrc = isWinter ? '/zenova-mask-mini-winter.png' : '/zenova-mask-mini.png';

  const [mainTab, setMainTab] = useState<'oracle' | 'synthax'>('oracle');
  const [prompt, setPrompt] = useState('');
  const [company, setCompany] = useState<Company>('solo');
  const [format, setFormat] = useState<Format>('all');
  const [length, setLength] = useState<Length>('any');
  const [activeMood, setActiveMood] = useState<Mood | null>(null);

  const [stage, setStage] = useState<'idle' | 'leaving' | 'thinking' | 'deck' | 'done' | 'empty'>('idle');
  const [scanStep, setScanStep] = useState(0);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [cursor, setCursor] = useState(0);
  const [saved, setSaved] = useState<Movie[]>([]);
  const [listView, setListView] = useState(false);

  /* Свайп колоды */
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flyDir, setFlyDir] = useState<0 | 1 | -1>(0);
  const startX = useRef<number | null>(null);

  const taste = [...favorites, ...watchHistory.map((h) => h.movie)];

  const discover = useCallback(async (mood: Mood | null, text: string): Promise<Pick[]> => {
    const tasteIds = new Set(taste.map((m) => cleanId(m.id)));
    const genreFreq = new Map<number, number>();
    taste.forEach((t) => (t.genre_ids || []).forEach((g) => genreFreq.set(g, (genreFreq.get(g) || 0) + 1)));

    let genres = mood ? [...mood.genres] : [];
    if (company === 'family') genres = genres.filter((g) => g !== 27 && g !== 53).concat(10751);
    if (company === 'date' && !mood) genres = [10749];
    if (company === 'friends' && !mood) genres = [35];
    genres = genres.slice(0, 2);

    const runtime: Partial<SmartDiscoverOpts> =
      length === 'short' ? { maxRuntime: 105 } : length === 'epic' ? { minRuntime: 140 } : {};

    const jobs: Promise<Movie[]>[] = [];
    const wantMovie = format !== 'tv';
    const wantTv = format !== 'movie' && length !== 'short';

    if (text) {
      if (wantMovie) jobs.push(searchMovies(text, 1, 'movie').then((r) => r.results || []).catch(() => []));
      if (wantTv) jobs.push(searchMovies(text, 1, 'series').then((r) => r.results || []).catch(() => []));
    }
    if (genres.length || !text) {
      if (wantMovie) jobs.push(smartDiscover({ mediaType: 'movie', genres, ...runtime }).catch(() => []));
      if (wantMovie && genres.length > 1) jobs.push(smartDiscover({ mediaType: 'movie', genres: [genres[0]], ...runtime }).catch(() => []));
      if (wantTv) {
        const tvG = Array.from(new Set(genres.map(toTvGenre).filter((g): g is number => g !== null))).slice(0, 1);
        jobs.push(smartDiscover({ mediaType: 'tv', genres: tvG }).catch(() => []));
      }
    }
    const last = watchHistory[0]?.movie;
    if (last && !text) {
      jobs.push(getRecommendations(cleanId(last.id), last.is_serial ? 'tv' : 'movie').catch(() => []));
    }

    const [pool] = await Promise.all([Promise.all(jobs), sleep(1500)]);
    const unique = new Map<string, Movie>();
    for (const m of pool.flat()) {
      if (!m.id || !m.poster_path || tasteIds.has(cleanId(m.id))) continue;
      if (format === 'movie' && m.is_serial) continue;
      if (format === 'tv' && !m.is_serial) continue;
      unique.set(m.id, m);
    }

    const scored = Array.from(unique.values()).map((m) => {
      const rating = m.vote_average || 0;
      let overlap = 0;
      let ref: Movie | null = null;
      for (const g of m.genre_ids || []) {
        if (genreFreq.has(g)) {
          overlap++;
          if (!ref) ref = taste.find((t) => t.genre_ids?.includes(g)) || null;
        }
      }
      const moodHit = mood ? (m.genre_ids || []).filter((g) => mood.genres.includes(g)).length : 0;
      const score = rating * 2.2 + overlap * 2 + moodHit * 3 + Math.min((m.popularity || 0) / 250, 2) + Math.random() * 1.5;
      return { m, rating, overlap, ref, score };
    });
    scored.sort((a, b) => b.score - a.score);

    return scored
      .filter((s) => s.rating >= 6 || scored.length <= 10)
      .slice(0, 10)
      .map((s, i) => {
        const reason = s.ref
          ? `Вам понравился «${s.ref.title}» — здесь похожая атмосфера`
          : mood
          ? mood.hint
          : s.rating >= 7.6
          ? `Признанный шедевр с рейтингом ${s.rating.toFixed(1)}`
          : 'Подобрано под ваш запрос';
        const match = Math.min(99, Math.max(78, Math.round(97 - i * 1.6 + s.overlap * 1.5)));
        return { movie: s.m, match, reason };
      });
  }, [taste, company, format, length, watchHistory]);

  const run = async (mood: Mood | null, text: string) => {
    haptic('medium');
    setActiveMood(mood);
    setStage('leaving');           // меню уезжает
    await sleep(320);
    setStage('thinking');
    setScanStep(0);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    const t1 = setTimeout(() => setScanStep(1), 500);
    const t2 = setTimeout(() => setScanStep(2), 1000);
    try {
      const result = await discover(mood, text.trim());
      clearTimeout(t1); clearTimeout(t2);
      setPicks(result);
      setCursor(0);
      setSaved([]);
      setListView(false);
      setStage(result.length ? 'deck' : 'empty');
      haptic(result.length ? 'heavy' : 'light');
    } catch {
      setStage('empty');
    }
  };

  const reset = () => {
    haptic('light');
    setStage('idle');
    setPicks([]);
    setActiveMood(null);
    setDragX(0);
    setFlyDir(0);
  };

  /* ── Логика колоды ── */
  const advance = (dir: 1 | -1) => {
    const current = picks[cursor];
    if (!current) return;
    if (dir === 1) {
      if (!isFavorite(current.movie.id)) addFavorite(current.movie);
      setSaved((s) => [...s, current.movie]);
      haptic('medium');
    } else {
      haptic('light');
    }
    setFlyDir(dir);
    setTimeout(() => {
      setFlyDir(0);
      setDragX(0);
      setCursor((c) => {
        const next = c + 1;
        if (next >= picks.length) setStage('done');
        return next;
      });
    }, 260);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (flyDir) return;
    startX.current = e.clientX;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    setDragX(e.clientX - startX.current);
  };
  const onPointerUp = () => {
    if (startX.current === null) return;
    const dx = dragX;
    startX.current = null;
    setDragging(false);
    if (Math.abs(dx) > 90) {
      advance(dx > 0 ? 1 : -1);
    } else if (Math.abs(dx) < 6) {
      setDragX(0);
      const p = picks[cursor];
      if (p) navigate(`/movie/${p.movie.id}`);
    } else {
      setDragX(0);
    }
  };

  const current = picks[cursor];
  const nextPick = picks[cursor + 1];
  const cardX = flyDir ? flyDir * 520 : dragX;
  const cardRot = cardX / 18;
  const likeOpacity = Math.max(0, Math.min(1, cardX / 90));
  const skipOpacity = Math.max(0, Math.min(1, -cardX / 90));

  const showMenu = stage === 'idle' || stage === 'leaving';

  return (
    <div className="orc page" style={{ '--orc-tint': activeMood?.tint || '#fb7185' } as React.CSSProperties}>
      <div className="orc-aura" aria-hidden="true" />

      {/* ── Шапка: маленькая маска + фирменное название ── */}
      <header className="orc-head">
        <div className="orc-brand">
          <span className="orc-brand__mask">
            <img src={maskSrc} alt="" />
          </span>
          <div className="orc-brand__copy">
            <span className="orc-brand__kicker">
              {mainTab === 'synthax' ? 'ZENOVA · PRO NEURAL' : 'ZENOVA · AI'}
            </span>
            <h1 className="orc-brand__title">
              {mainTab === 'synthax' ? 'SYNTHAX-9' : 'Оракул'}
            </h1>
          </div>
        </div>
        {mainTab === 'oracle' && !showMenu && (
          <button type="button" className="orc-head__back" onClick={reset}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            Новый подбор
          </button>
        )}
      </header>

      {/* ── Двухрежимный переключатель: Оракул (Колода) / SYNTHAX-9 (PRO ИИ Студия) ── */}
      <div className="orc-main-switch">
        <button
          type="button"
          className={`orc-main-switch__btn ${mainTab === 'oracle' ? 'is-active' : ''}`}
          onClick={() => {
            haptic('light');
            setMainTab('oracle');
          }}
        >
          <span className="orc-main-switch__icon">🔮</span>
          <span>Кино-Оракул</span>
        </button>

        <button
          type="button"
          className={`orc-main-switch__btn orc-main-switch__btn--pro ${mainTab === 'synthax' ? 'is-active' : ''}`}
          onClick={() => {
            haptic('medium');
            setMainTab('synthax');
          }}
        >
          <span className="orc-main-switch__icon">⚡</span>
          <span>SYNTHAX-9</span>
          <span className="orc-main-switch__badge orc-main-switch__badge--dev">СКОРО</span>
        </button>
      </div>

      {mainTab === 'synthax' ? (
        <SynthaxAiStudio onBackToOracle={() => setMainTab('oracle')} />
      ) : (
        <>
          {/* ═════════ МЕНЮ ВЫБОРА (уезжает после нажатия) ═════════ */}
      {showMenu && (
        <div className={`orc-menu ${stage === 'leaving' ? 'is-leaving' : ''}`}>
          <p className="orc-lead">Скажите, что хочется — Оракул покажет фильм за секунды.</p>

          <form
            className="orc-search-shell"
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim()) run(null, prompt);
            }}
          >
            <div className="orc-search-box">
              <YandexGlowInput
                value={prompt}
                onChange={(val) => setPrompt(val)}
                placeholder="Что найти? Например: «как Интерстеллар, но короче»"
                icon={
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="16.5" y1="16.5" x2="21" y2="21" />
                  </svg>
                }
                onClear={() => {
                  haptic('light');
                  setPrompt('');
                }}
              />
            </div>
            {prompt.trim() && (
              <button type="submit" className="orc-search-btn" aria-label="Подобрать фильм">
                <span>Подобрать</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            )}
          </form>

          {/* Контекст просмотра — то, чего нет у других кинотеатров */}
          <div className="orc-ctx">
            <span className="orc-ctx__label">С кем смотрим</span>
            <div className="orc-seg">
              {COMPANY.map((c) => (
                <button key={c.id} type="button" className={`orc-seg__btn ${company === c.id ? 'on' : ''}`} onClick={() => { haptic('light'); setCompany(c.id); }}>
                  <span>{c.icon}</span>{c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="orc-ctx orc-ctx--row">
            <div className="orc-seg orc-seg--sm">
              {([['all', 'Всё'], ['movie', 'Фильм'], ['tv', 'Сериал']] as const).map(([id, l]) => (
                <button key={id} type="button" className={`orc-seg__btn ${format === id ? 'on' : ''}`} onClick={() => { haptic('light'); setFormat(id); }}>{l}</button>
              ))}
            </div>
            <div className="orc-seg orc-seg--sm">
              {([['any', 'Любой'], ['short', '≤ 1:45'], ['epic', 'Эпик']] as const).map(([id, l]) => (
                <button key={id} type="button" className={`orc-seg__btn ${length === id ? 'on' : ''}`} onClick={() => { haptic('light'); setLength(id); }}>{l}</button>
              ))}
            </div>
          </div>

          <span className="orc-section-label">Настроение · одно касание</span>
          <div className="orc-moods">
            {MOODS.map((m, i) => (
              <button
                key={m.id}
                type="button"
                className="orc-mood"
                style={{ '--m-tint': m.tint, animationDelay: `${i * 35}ms` } as React.CSSProperties}
                onClick={() => run(m, '')}
              >
                <span className="orc-mood__icon">{m.icon}</span>
                <span className="orc-mood__text">
                  <strong>{m.label}</strong>
                  <small>{m.hint}</small>
                </span>
              </button>
            ))}
          </div>

          <button type="button" className="orc-taste" onClick={() => run(null, '')}>
            <span className="orc-taste__spark">✦</span>
            <span className="orc-taste__text">
              <strong>По моему вкусу</strong>
              <small>{taste.length ? `Анализ ${taste.length} ваших тайтлов` : 'Лучшее прямо сейчас'}</small>
            </span>
            <span className="orc-taste__arrow">→</span>
          </button>
        </div>
      )}

      {/* ═════════ ДУМАЕТ ═════════ */}
      {stage === 'thinking' && (
        <div className="orc-think">
          <div className="orc-think__orb">
            <i /><i /><i />
            <img src={maskSrc} alt="" />
          </div>
          <h2 className="orc-think__title">{activeMood ? `${activeMood.icon} ${activeMood.label}` : 'Оракул думает'}</h2>
          <ul className="orc-think__steps">
            {SCAN_LINES.map((l, i) => (
              <li key={l} className={scanStep >= i ? 'on' : ''}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ═════════ КОЛОДА РЕЗУЛЬТАТОВ (выскакивает) ═════════ */}
      {stage === 'deck' && current && (
        <section className="orc-deck-wrap">
          <div className="orc-deck-bar">
            <span className="orc-deck-bar__count"><b>{cursor + 1}</b> / {picks.length}</span>
            <div className="orc-deck-bar__progress"><i style={{ width: `${((cursor + 1) / picks.length) * 100}%` }} /></div>
            <button type="button" className="orc-deck-bar__toggle" onClick={() => { haptic('light'); setListView((v) => !v); }}>
              {listView ? 'Колода' : 'Списком'}
            </button>
          </div>

          {!listView ? (
            <>
              <div className="orc-deck">
                {nextPick && (
                  <div className="orc-card orc-card--under" style={{ backgroundImage: `url(${nextPick.movie.poster_path})` }} />
                )}
                <article
                  key={current.movie.id}
                  className={`orc-card ${dragging ? 'is-dragging' : ''}`}
                  style={{ transform: `translate3d(${cardX}px,0,0) rotate(${cardRot}deg)`, opacity: flyDir ? 0 : 1 }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={() => { startX.current = null; setDragging(false); setDragX(0); }}
                >
                  <img className="orc-card__img" src={current.movie.poster_path} alt={current.movie.title} draggable={false} />
                  <div className="orc-card__shade" />
                  <span className="orc-card__stamp orc-card__stamp--like" style={{ opacity: likeOpacity }}>СОХРАНИТЬ</span>
                  <span className="orc-card__stamp orc-card__stamp--skip" style={{ opacity: skipOpacity }}>ДАЛЬШЕ</span>
                  <div className="orc-card__match">
                    <svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" /><circle cx="18" cy="18" r="15.5" style={{ strokeDasharray: `${current.match * 0.974} 100` }} /></svg>
                    <b>{current.match}%</b>
                  </div>
                  <div className="orc-card__info">
                    <span className="orc-card__meta">
                      {current.movie.is_serial ? 'Сериал' : 'Фильм'}
                      {current.movie.release_date ? ` · ${current.movie.release_date.slice(0, 4)}` : ''}
                      {current.movie.vote_average > 0 ? ` · ★ ${current.movie.vote_average.toFixed(1)}` : ''}
                    </span>
                    <h2 className="orc-card__title">{current.movie.title}</h2>
                    <p className="orc-card__reason">✦ {current.reason}</p>
                  </div>
                </article>
              </div>

              <div className="orc-actions">
                <button type="button" className="orc-act orc-act--skip" onClick={() => advance(-1)} aria-label="Дальше">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
                <button type="button" className="orc-act orc-act--play" onClick={() => { haptic('medium'); navigate(`/movie/${current.movie.id}`); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  Смотреть
                </button>
                <button type="button" className="orc-act orc-act--like" onClick={() => advance(1)} aria-label="Сохранить">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3.1 4.5 6.9 4.5c2.1 0 3.6 1.1 5.1 2.9 1.5-1.8 3-2.9 5.1-2.9 3.8 0 6 3.8 4.5 7.3C19.5 16.4 12 21 12 21z" /></svg>
                </button>
              </div>
              <p className="orc-hint">Свайп вправо — в избранное · влево — следующий · тап — открыть</p>
            </>
          ) : (
            <div className="orc-grid">
              {picks.map((p) => (
                <button key={p.movie.id} type="button" className="orc-grid__item" onClick={() => navigate(`/movie/${p.movie.id}`)}>
                  <img src={p.movie.poster_path} alt="" loading="lazy" />
                  <span className="orc-grid__match">{p.match}%</span>
                  <span className="orc-grid__title">{p.movie.title}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═════════ ИТОГ ═════════ */}
      {stage === 'done' && (
        <section className="orc-done">
          <div className="orc-done__icon">✦</div>
          <h2>Подборка просмотрена</h2>
          <p>{saved.length ? `Сохранено в избранное: ${saved.length}` : 'Ничего не зацепило? Попробуем иначе.'}</p>
          {saved.length > 0 && (
            <div className="orc-done__saved">
              {saved.map((m) => (
                <button key={m.id} type="button" onClick={() => navigate(`/movie/${m.id}`)}>
                  <img src={m.poster_path} alt={m.title} />
                </button>
              ))}
            </div>
          )}
          <div className="orc-done__btns">
            <button type="button" className="orc-act orc-act--play" onClick={() => run(activeMood, prompt)}>Ещё подборка</button>
            <button type="button" className="orc-done__ghost" onClick={reset}>Другое настроение</button>
          </div>
        </section>
      )}

      {stage === 'empty' && (
        <section className="orc-done">
          <div className="orc-done__icon">∅</div>
          <h2>Оракул не нашёл совпадений</h2>
          <p>Смягчите фильтры или выберите другое настроение.</p>
          <div className="orc-done__btns">
            <button type="button" className="orc-act orc-act--play" onClick={reset}>Назад к выбору</button>
          </div>
        </section>
      )}
        </>
      )}
    </div>
  );
};

export default AiPickPage;
