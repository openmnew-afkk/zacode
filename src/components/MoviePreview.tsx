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

              {/* Rating badge */}
              {rating && (
                <div className="mpv-rating-badge">⭐ {rating}</div>
              )}
            </div>

            {/* Info below poster */}
            <div className="mpv-body">
              <h2 className="mpv-title">{movie.title}</h2>

              {/* Meta row */}
              {(year || runtime) && (
                <div className="mpv-meta">
                  {movie.type === 'series' ? '📺 Сериал' : '🎬 Фильм'}
                  {year && <span className="mpv-dot">·</span>}
                  {year && <span>{year}</span>}
                  {runtime && <span className="mpv-dot">·</span>}
                  {runtime && <span>{runtime} мин</span>}
                </div>
              )}

              {/* Genre tags like photo 1 */}
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
                  ▶ Смотреть
                </button>
                <button className="mpv-btn-close" onClick={close}>✕</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MoviePreview;
