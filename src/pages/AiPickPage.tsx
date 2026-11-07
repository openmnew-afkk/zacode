import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { smartDiscover, getRecommendations, searchMovies } from '../api/catalog';
import { useStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import type { Movie } from '../types';
import SeasonalMask from '../components/SeasonalMask';
import { getStoredSeason } from '../services/seasons';
import './AiPickPage.css';

interface NeuralPreset {
  id: string;
  icon: string;
  label: string;
  query: string;
  genres: number[];
  hint: string;
}

const NEURAL_PRESETS: NeuralPreset[] = [
  {
    id: 'mindfuck',
    icon: '🧠',
    label: 'Взрыв мозга',
    query: 'триллер закрученный финал',
    genres: [9648, 53, 878],
    hint: 'Сложный нелинейный сюжет с шокирующей развязкой',
  },
  {
    id: 'space',
    icon: '🌌',
    label: 'Космос & Sci-Fi',
    query: 'космос научная фантастика',
    genres: [878, 12],
    hint: 'Другие миры, квантовые парадоксы и технологии будущего',
  },
  {
    id: 'noir',
    icon: '🕯️',
    label: 'Тёмный нуар',
    query: 'детектив расследование',
    genres: [80, 9648, 53],
    hint: 'Мрачный дождливый детектив и глубокий психологический саспенс',
  },
  {
    id: 'chill',
    icon: '🍿',
    label: 'Уютный попкорн',
    query: 'комедия приключения',
    genres: [35, 12, 10751],
    hint: 'Легкое позитивное кино для идеального отдыха после тяжелого дня',
  },
  {
    id: 'hidden_gems',
    icon: '🏆',
    label: 'Скрытые шедевры',
    query: 'шедевр кино',
    genres: [18, 53],
    hint: 'Редкие фестивальные жемчужины с выдающимся рейтингом 8.0+',
  },
  {
    id: 'tearjerker',
    icon: '💔',
    label: 'Глубокая драма',
    query: 'драма сильные чувства',
    genres: [18, 10749],
    hint: 'Трогательная история, вызывающая сильные искренние эмоции',
  },
];

interface PickItem {
  movie: Movie;
  match: number;
  reason: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cleanId = (id: string) => id.replace(/^(tv|movie)-/, '');

const AiPickPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { favorites, watchHistory, isFavorite, addFavorite, removeFavorite } = useStore();
  const [season] = useState(() => getStoredSeason().season.id);
  const maskSeason = season === 'none' ? 'autumn' : season;

  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<NeuralPreset | null>(null);
  const [stage, setStage] = useState<'idle' | 'thinking' | 'results' | 'empty'>('idle');
  const [picks, setPicks] = useState<PickItem[]>([]);
  const [scanStep, setScanStep] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const taste = [...favorites, ...watchHistory.map((h) => h.movie)];

  const runNeuralDiscovery = async (customText?: string, preset?: NeuralPreset) => {
    haptic('medium');
    setStage('thinking');
    setScanStep(1);

    const userText = (customText !== undefined ? customText : prompt).trim();
    const activePreset = preset || selectedPreset;

    const tasteIds = new Set(taste.map((m) => cleanId(m.id)));
    const genreFreq = new Map<number, number>();
    for (const t of taste) {
      (t.genre_ids || []).forEach((g) => genreFreq.set(g, (genreFreq.get(g) || 0) + 1));
    }

    try {
      setTimeout(() => setScanStep(2), 600);
      setTimeout(() => setScanStep(3), 1100);

      const fetchPool: Promise<Movie[]>[] = [];

      // 1. Полнотекстовый семантический поиск, если введён промпт
      if (userText) {
        fetchPool.push(
          searchMovies(userText, 1, 'movie')
            .then((res) => res.results || [])
            .catch(() => [])
        );
        fetchPool.push(
          searchMovies(userText, 1, 'series')
            .then((res) => res.results || [])
            .catch(() => [])
        );
      }

      // 2. Discover по жанрам пресета
      if (activePreset) {
        fetchPool.push(
          smartDiscover({
            mediaType: 'movie',
            genres: activePreset.genres,
          }).catch(() => [])
        );
        fetchPool.push(
          smartDiscover({
            mediaType: 'tv',
            genres: activePreset.genres,
          }).catch(() => [])
        );
      }

      // 3. Персональные рекомендации по последнему просмотренному
      const last = watchHistory[0]?.movie;
      if (last) {
        fetchPool.push(
          getRecommendations(cleanId(last.id), last.is_serial ? 'tv' : 'movie').catch(() => [])
        );
      }

      // Если ничего не было введено — берем топовые шедевры
      if (!userText && !activePreset) {
        fetchPool.push(
          smartDiscover({
            mediaType: 'movie',
          }).catch(() => [])
        );
      }

      const [poolArrays] = await Promise.all([
        Promise.all(fetchPool),
        sleep(1350), // приятный эффект нейро-сканирования
      ]);

      const flat = poolArrays.flat();
      const uniqueMap = new Map<string, Movie>();

      for (const m of flat) {
        if (!m.id || !m.poster_path) continue;
        if (!tasteIds.has(cleanId(m.id))) {
          uniqueMap.set(m.id, m);
        }
      }

      const scored = Array.from(uniqueMap.values()).map((m) => {
        const rating = m.vote_average || 0;
        let overlap = 0;
        let tasteRef: Movie | null = null;
        for (const g of m.genre_ids || []) {
          if (genreFreq.has(g)) {
            overlap++;
            if (!tasteRef) tasteRef = taste.find((t) => t.genre_ids?.includes(g)) || null;
          }
        }
        const score = rating * 2.2 + overlap * 2.8 + Math.min((m.popularity || 0) / 250, 2);
        return { m, rating, overlap, tasteRef, score };
      });

      scored.sort((a, b) => b.score - a.score);

      const items: PickItem[] = [];
      const seen = new Set<string>();

      for (const s of scored) {
        if (items.length >= 8) break;
        if (s.rating < 6.0 && scored.length > 8) continue;
        if (seen.has(s.m.id)) continue;
        seen.add(s.m.id);

        const reasons: string[] = [];
        if (s.tasteRef) {
          reasons.push(`Похоже по атмосфере на «${s.tasteRef.title}»`);
        } else if (activePreset) {
          reasons.push(activePreset.hint);
        } else if (s.overlap >= 2) {
          reasons.push('Точно совпадает с вашим профилем жанров');
        }

        if (s.rating >= 7.6) {
          reasons.push(`Признанный шедевр ★${s.rating.toFixed(1)}`);
        }

        const matchPercent = Math.min(
          99,
          Math.max(82, Math.round(76 + s.overlap * 5 + (s.rating - 6) * 4.2 + (Math.random() * 4)))
        );

        items.push({
          movie: s.m,
          match: matchPercent,
          reason: reasons.slice(0, 2).join(' · ') || 'Персональная рекомендация нейросети',
        });
      }

      setPicks(items);
      setStage(items.length > 0 ? 'results' : 'empty');
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    } catch {
      setStage('empty');
    }
  };

  const handlePresetClick = (preset: NeuralPreset) => {
    haptic('light');
    setSelectedPreset(preset);
    setPrompt(preset.query);
    runNeuralDiscovery(preset.query, preset);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !selectedPreset) return;
    runNeuralDiscovery(prompt, selectedPreset || undefined);
  };

  const resetAll = () => {
    haptic('light');
    setPrompt('');
    setSelectedPreset(null);
    setPicks([]);
    setStage('idle');
  };

  return (
    <div className="aip page">
      {/* ── Премиальный стеклянный заголовок ── */}
      <header className="aip-header">
        <div className="aip-header__brand">
          <SeasonalMask season={maskSeason} className="aip-header__mask" />
          <div className="aip-header__copy">
            <span className="aip-header__kicker">ZENOVA NEURAL ENGINE</span>
            <h1 className="aip-header__title">КиноИИ</h1>
          </div>
        </div>

        {stage !== 'idle' && (
          <button
            type="button"
            className="aip-header__reset-btn"
            onClick={resetAll}
            title="Новый запрос"
          >
            ✕ Сброс
          </button>
        )}
      </header>

      {/* ── Нейро-строка свободного ввода запроса ── */}
      <div className="aip-search-shell">
        <form className="aip-search-form" onSubmit={handleFormSubmit}>
          <div className="aip-search-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            className="aip-search-input"
            placeholder="Спросите ИИ: фильм как Начало, или уютная комедия…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          {prompt && (
            <button
              type="button"
              className="aip-search-clear"
              onClick={() => {
                haptic('light');
                setPrompt('');
                inputRef.current?.focus();
              }}
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            className="aip-search-btn"
            aria-label="Искать нейросетью"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>

      {/* ── Быстрые нейро-режимы подбора ── */}
      {stage !== 'thinking' && (
        <div className="aip-presets-section">
          <div className="aip-presets-head">
            <span className="aip-presets-title">Нейро-режимы под настроение</span>
          </div>
          <div className="aip-presets-grid">
            {NEURAL_PRESETS.map((p) => {
              const isActive = selectedPreset?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`aip-preset-chip ${isActive ? 'is-active' : ''}`}
                  onClick={() => handlePresetClick(p)}
                >
                  <span className="aip-preset-chip__icon">{p.icon}</span>
                  <div className="aip-preset-chip__info">
                    <strong className="aip-preset-chip__label">{p.label}</strong>
                    <span className="aip-preset-chip__hint">{p.hint}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Состояние глубокого анализа нейросети ── */}
      {stage === 'thinking' && (
        <div className="aip-thinking">
          <div className="aip-radar-orb">
            <div className="aip-radar-orb__ring" />
            <div className="aip-radar-orb__ring aip-radar-orb__ring--delayed" />
            <div className="aip-radar-orb__core">
              <span>✦</span>
            </div>
          </div>
          <h2 className="aip-thinking__title">Нейросеть подбирает фильмы…</h2>
          <div className="aip-thinking__steps">
            <p className={scanStep >= 1 ? 'is-done' : ''}>
              {scanStep >= 1 ? '✓' : '○'} Анализ семантического запроса и скрытых тропов
            </p>
            <p className={scanStep >= 2 ? 'is-done' : ''}>
              {scanStep >= 2 ? '✓' : '○'} Сопоставление с вашей историей и любимыми жанрами
            </p>
            <p className={scanStep >= 3 ? 'is-done' : ''}>
              {scanStep >= 3 ? '✓' : '○'} Ранжирование по рейтингу и совместимости
            </p>
          </div>
        </div>
      )}

      {/* ── Пустой результат ── */}
      {stage === 'empty' && (
        <div className="aip-empty">
          <div className="aip-empty__icon">🔍</div>
          <h3 className="aip-empty__title">Ничего не найдено</h3>
          <p className="aip-empty__sub">
            Попробуйте сформулировать запрос другими словами или выберите один из быстрых нейро-режимов выше.
          </p>
          <button type="button" className="aip-empty__btn" onClick={resetAll}>
            Попробовать другой запрос
          </button>
        </div>
      )}

      {/* ── Результаты генерации ── */}
      {stage === 'results' && picks.length > 0 && (
        <section className="aip-results">
          <div className="aip-results__head">
            <div className="aip-results__title-box">
              <h2 className="aip-results__title">Идеальные совпадения</h2>
              <span className="aip-results__count">{picks.length} фильмов</span>
            </div>
            <button
              type="button"
              className="aip-results__regen-btn"
              onClick={() => runNeuralDiscovery()}
            >
              🔄 Обновить
            </button>
          </div>

          <div className="aip-cards-list">
            {picks.map(({ movie, match, reason }) => {
              const fav = isFavorite(movie.id);
              return (
                <article
                  key={movie.id}
                  className="aip-match-card"
                  onClick={() => navigate(`/movie/${movie.id}`)}
                >
                  <div
                    className="aip-match-card__cover"
                    style={{
                      backgroundImage: `url(${movie.backdrop_path || movie.poster_path})`,
                    }}
                  >
                    <div className="aip-match-card__cover-gradient" />
                    
                    <div className="aip-match-card__badges">
                      <span className="aip-match-card__type">
                        {movie.is_serial ? 'Сериал' : 'Фильм'}
                      </span>
                      <span className="aip-match-card__score">
                        ★ {match}% совпадение
                      </span>
                    </div>

                    <div className="aip-match-card__bottom-info">
                      <h3 className="aip-match-card__title">{movie.title}</h3>
                      <p className="aip-match-card__year-rate">
                        {movie.release_date?.slice(0, 4)}
                        {movie.vote_average > 0 ? ` · ★ ${movie.vote_average.toFixed(1)}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="aip-match-card__body">
                    <div className="aip-match-card__reason">
                      <span className="aip-match-card__reason-glyph">✦</span>
                      <span className="aip-match-card__reason-text">{reason}</span>
                    </div>

                    <div className="aip-match-card__actions">
                      <button
                        type="button"
                        className="aip-match-card__watch-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          haptic('medium');
                          navigate(`/movie/${movie.id}`);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span>Смотреть</span>
                      </button>

                      <button
                        type="button"
                        className={`aip-match-card__fav-btn ${fav ? 'is-fav' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          haptic('light');
                          fav ? removeFavorite(movie.id) : addFavorite(movie);
                        }}
                        aria-label="В избранное"
                      >
                        {fav ? '❤️' : '🤍'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default AiPickPage;
