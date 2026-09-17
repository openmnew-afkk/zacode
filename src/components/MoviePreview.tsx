import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Movie } from '../types';
import './MoviePreview.css';

interface Props {
  movie: Movie;
  children: React.ReactNode;
}

const LONG_PRESS_MS = 550;

const MoviePreview: React.FC<Props> = ({ movie, children }) => {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const touch = 'touches' in e ? e.touches[0] : e as MouseEvent;
    const x = touch.clientX;
    const y = touch.clientY;
    timerRef.current = setTimeout(() => {
      setPos({ x, y });
      setOpen(true);
      // Haptic
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); } catch {}
    }, LONG_PRESS_MS);
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const genres = (movie.genres || []).slice(0, 3).join(' · ');
  const year = movie.release_date?.slice(0, 4) || '';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';
  const poster = movie.poster_path || movie.backdrop_path || '';

  return (
    <>
      <div
        onTouchStart={start}
        onTouchEnd={cancel}
        onTouchMove={cancel}
        onMouseDown={start}
        onMouseUp={cancel}
        onMouseLeave={cancel}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {children}
      </div>

      {open && (
        <div className="mpv-overlay" onClick={close}>
          <div
            className="mpv-card"
            style={{
              // позиционируем рядом с нажатием, но не за край экрана
              top: Math.min(pos.y - 20, window.innerHeight - 420),
              left: Math.min(Math.max(pos.x - 120, 8), window.innerWidth - 256),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Poster */}
            {poster && (
              <div className="mpv-poster">
                <img src={poster} alt={movie.title} />
                <div className="mpv-poster__fade" />
              </div>
            )}

            {/* Info */}
            <div className="mpv-info">
              <h3 className="mpv-title">{movie.title}</h3>
              {(year || rating) && (
                <div className="mpv-meta">
                  {year && <span className="mpv-year">{year}</span>}
                  {rating && <span className="mpv-rating">⭐ {rating}</span>}
                  {movie.runtime && <span className="mpv-runtime">{movie.runtime} мин</span>}
                </div>
              )}
              {genres && <div className="mpv-genres">{genres}</div>}
              {movie.overview && (
                <p className="mpv-overview">{movie.overview.slice(0, 120)}…</p>
              )}
            </div>

            {/* Actions */}
            <div className="mpv-actions">
              <button
                className="mpv-btn mpv-btn--watch"
                onClick={() => { close(); navigate(`/movie/${movie.id}`); }}
              >
                ▶ Смотреть
              </button>
              <button className="mpv-btn mpv-btn--close" onClick={close}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MoviePreview;
