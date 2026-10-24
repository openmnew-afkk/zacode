import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Movie } from '../types';
import './MoviePreview.css';

interface Props {
  movie: Movie;
  children: React.ReactNode;
}

const LONG_PRESS_MS = 500;

const MoviePreview: React.FC<Props> = ({ movie, children }) => {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  const start = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setOpen(true);
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch {}
    }, LONG_PRESS_MS);
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const poster = movie.poster_path || movie.backdrop_path || '';
  const year = movie.release_date?.slice(0, 4) || '';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';
  const genres = (movie.genres || []).slice(0, 4);
  const runtime = movie.runtime;

  return (
    <>
      <div
        onTouchStart={start}
        onTouchEnd={cancel}
        onTouchMove={cancel}
        onMouseDown={start}
        onMouseUp={cancel}
        onMouseLeave={cancel}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}
      >
        {children}
      </div>

      {open && (
        <div className="mpv-overlay" onClick={close}>
          <div className="mpv-card" onClick={(e) => e.stopPropagation()}>
            {/* Full poster */}
            <div className="mpv-poster">
              {poster
                ? <img src={poster} alt={movie.title} />
                : <div className="mpv-poster-ph">🎬</div>
              }
              {/* Gradient fade */}
              <div className="mpv-poster__fade" />

              {/* Type badge */}
              <div className="mpv-type-badge">
                {movie.type === 'series' ? 'Сериал' : 'Фильм'}
              </div>

              {/* Rating badge */}
              {rating && (
                <div className="mpv-rating-badge">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.5l7.1-.6L12 2z"/></svg>
                  {rating}
                </div>
              )}
            </div>

            {/* Info below poster */}
            <div className="mpv-body">
              <h2 className="mpv-title">{movie.title}</h2>

              {/* Meta row */}
              {(year || runtime) && (
                <div className="mpv-meta">
                  {year && <span>{year}</span>}
                  {year && runtime && <span className="mpv-dot">·</span>}
                  {runtime && <span>{runtime} мин</span>}
                </div>
              )}

              {/* Genre tags */}
              {genres.length > 0 && (
                <div className="mpv-tags">
                  {genres.map((g) => (
                    <span key={g} className="mpv-tag">{g}</span>
                  ))}
                </div>
              )}

              {/* Overview */}
              {movie.overview && (
                <p className="mpv-overview">{movie.overview.slice(0, 150)}{movie.overview.length > 150 ? '…' : ''}</p>
              )}

              {/* Actions */}
              <div className="mpv-actions">
                <button
                  className="mpv-btn-watch"
                  onClick={() => { close(); navigate(`/movie/${movie.id}`); }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Смотреть
                </button>
                <button className="mpv-btn-close" onClick={close} aria-label="Закрыть">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MoviePreview;
