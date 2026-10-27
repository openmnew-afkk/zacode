import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMovies } from '../api/catalog';
import type { Movie } from '../types';
import './HalloweenPage.css';

const bats = [
  { className: 'hw-bat hw-bat--one', scale: 1 },
  { className: 'hw-bat hw-bat--two', scale: 0.7 },
  { className: 'hw-bat hw-bat--three', scale: 1.15 },
  { className: 'hw-bat hw-bat--four', scale: 0.55 },
  { className: 'hw-bat hw-bat--five', scale: 0.85 },
  { className: 'hw-bat hw-bat--six', scale: 0.65 },
];

const HalloweenPage: React.FC = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<Movie[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [storiesError, setStoriesError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadingStories(true);
    setStoriesError('');
    searchMovies('#ужасы', 1, 'movie')
      .then((result) => {
        if (!result.ok) throw new Error('Could not load horror collection');
        if (active) setStories(result.results.filter((movie) => movie.poster_path).slice(0, 12));
      })
      .catch(() => {
        if (active) setStoriesError('Не удалось открыть ночную киноленту. Проверьте соединение и попробуйте ещё раз.');
      })
      .finally(() => {
        if (active) setLoadingStories(false);
      });
    return () => { active = false; };
  }, [retry]);

  return (
    <main className="hw-page page">
      <div className="hw-sky" aria-hidden="true">
        <div className="hw-moon" />
        {bats.map((bat) => (
          <svg key={bat.className} className={bat.className} viewBox="0 0 64 34" style={{ transform: `scale(${bat.scale})` }}>
            <path d="M32 13c-5-8-11-10-19-9 4 5 5 9 4 13-5-5-10-6-16-5 5 4 8 9 9 15 7-1 13-4 18-9l4 7 4-7c5 5 11 8 18 9 1-6 4-11 9-15-6-1-11 0-16 5-1-4 0-8 4-13-8-1-14 1-19 9Z" />
          </svg>
        ))}
        <span className="hw-fog hw-fog--one" />
        <span className="hw-fog hw-fog--two" />
      </div>

      <header className="hw-header">
        <button className="hw-back" type="button" onClick={() => navigate('/')} aria-label="Вернуться на главную">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m14.5 18-6-6 6-6" />
          </svg>
        </button>
        <span className="hw-header__label">ZENOVA AFTER DARK</span>
        <img src="/zenova-mask.svg" alt="" className="hw-header__mask" />
      </header>

      <section className="hw-hero" aria-labelledby="hw-title">
        <div className="hw-seal" aria-hidden="true">
          <span className="hw-seal__orbit" />
          <img src="/zenova-mask.svg" alt="" />
        </div>
        <p className="hw-kicker"><span /> ПОСЛЕ ЗАКАТА ПРАВИЛА МЕНЯЮТСЯ</p>
        <h1 id="hw-title">Ты точно<br />здесь <em>один?</em></h1>
        <p className="hw-copy">
          За дверью уже шуршат крылья. Не оборачивайся — просто выбери, какую историю посмотреть этой ночью.
        </p>
        <button className="hw-cta" type="button" onClick={() => document.getElementById('hw-stories')?.scrollIntoView({ behavior: 'smooth' })}>
          <span>Открыть ночную киноленту</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </button>
        <span className="hw-whisper">НЕ ВСЕ ИСТОРИИ ЗАКАНЧИВАЮТСЯ НА ТИТРАХ</span>
      </section>

      <section className="hw-stories" id="hw-stories" aria-labelledby="hw-stories-title">
        <div className="hw-stories__heading">
          <div>
            <p className="hw-stories__eyebrow">ПОСЛЕ ПОЛУНОЧИ</p>
            <h2 id="hw-stories-title">Что прячется во тьме</h2>
          </div>
          <span aria-hidden="true">
            {stories.length > 0 ? `01 / ${String(stories.length).padStart(2, '0')}` : 'НОЧНАЯ ПОДБОРКА'}
          </span>
        </div>
        <p className="hw-stories__intro">Выбери историю. Только не смотри её в одиночестве.</p>
        {loadingStories ? (
          <div className="hw-stories__loading" role="status">Проявляем плёнку из темноты…</div>
        ) : storiesError ? (
          <div className="hw-stories__error" role="status">
            <p>{storiesError}</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)}>Попробовать ещё раз</button>
          </div>
        ) : stories.length > 0 ? (
          <div className="hw-stories__rail">
            {stories.map((movie, index) => (
              <button
                className="hw-story"
                key={movie.id}
                type="button"
                onClick={() => navigate(`/movie/${movie.id}`)}
                aria-label={`Открыть фильм ${movie.title}`}
              >
                <span className="hw-story__poster">
                  <img src={movie.poster_path} alt="" loading="lazy" />
                  <span className="hw-story__number">{String(index + 1).padStart(2, '0')}</span>
                  {movie.vote_average > 0 && <span className="hw-story__rating">★ {movie.vote_average.toFixed(1)}</span>}
                </span>
                <span className="hw-story__title">{movie.title}</span>
                <span className="hw-story__year">{movie.release_date?.slice(0, 4) || 'Ночная история'}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="hw-stories__loading">В эту ночь плёнка оказалась пуста.</div>
        )}
      </section>

      <div className="hw-bottom" aria-hidden="true">
        <span>31</span>
        <i />
        <span>10</span>
        <i />
        <span>Ночь историй</span>
      </div>
    </main>
  );
};

export default HalloweenPage;
