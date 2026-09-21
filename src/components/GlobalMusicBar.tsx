import React, { useEffect, useRef, useState } from 'react';
import { useMusicStore } from '../store/musicStore';
import './GlobalMusicBar.css';

const GlobalMusicBar: React.FC = () => {
  const {
    currentTrack, isPlaying, progress, duration, queue,
    setPlaying, nextTrack, prevTrack, toggleLike, isLiked,
    setProgress, setDuration, shuffleOn, repeatOn, toggleShuffle, toggleRepeat,
  } = useMusicStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [imgError, setImgError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toast, setToast] = useState('');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  };

  const handleShare = () => {
    setShowMenu(false);
    if (!currentTrack) return;
    const text = `Слушаю трек: ${currentTrack.title} — ${currentTrack.artist} в KINOVERSE!`;
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({ title: currentTrack.title, text, url: shareUrl }).catch(() => {});
    } else {
      const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
      window.open(tgUrl, '_blank');
      showToastMsg('Отправка в Telegram…');
    }
  };

  const handleCopyName = () => {
    setShowMenu(false);
    if (!currentTrack) return;
    navigator.clipboard?.writeText(`${currentTrack.title} — ${currentTrack.artist}`).then(() => {
      showToastMsg('Название скопировано в буфер 📋');
    }).catch(() => {});
  };

  // Создаём audio элемент
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.addEventListener('ended', () => nextTrack());
      audio.addEventListener('timeupdate', () => setProgress(audio.currentTime));
      audio.addEventListener('durationchange', () => setDuration(audio.duration || 0));
      audioRef.current = audio;
    }
  }, []);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    audioRef.current.src = currentTrack.streamUrl;
    setImgError(false);
    if (isPlaying) audioRef.current.play().catch(() => {});
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying]);

  if (!currentTrack) return null;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const liked = isLiked(currentTrack.id);
  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
    if (audioRef.current) audioRef.current.currentTime = pos;
    setProgress(pos);
  };

  const art = currentTrack.artwork && !imgError ? currentTrack.artwork : '';

  /* ══ Развёрнутый плеер (slide-up fullscreen) ══ */
  if (expanded) {
    return (
      <div className="gfull">
        {/* BG blur */}
        {art && <div className="gfull__bg" style={{ backgroundImage: `url(${art})` }} />}
        <div className="gfull__overlay" />

        {/* Swipe-down handle */}
        <div className="gfull__handle" onClick={() => setExpanded(false)}>
          <div className="gfull__handle-bar" />
        </div>

        {/* Header */}
        <div className="gfull__header">
          <button className="gfull__btn-sm" onClick={() => setExpanded(false)} aria-label="Свернуть">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <span className="gfull__now-label">Сейчас играет</span>
          <button className="gfull__btn-sm" onClick={() => setShowMenu(true)} aria-label="Меню трека">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="6" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="18" r="1.5" fill="currentColor"/></svg>
          </button>
        </div>

        {/* Big album art with gradient sheen */}
        <div className="gfull__art">
          {art
            ? <img src={art} alt="" onError={() => setImgError(true)} />
            : <div className="gfull__art-ph">🎵</div>
          }
          <div className="gfull__art-gradient" />
        </div>

        {/* Track info */}
        <div className="gfull__info">
          <div className="gfull__title">{currentTrack.title}</div>
          <div className="gfull__artist">{currentTrack.artist}</div>
        </div>

        {/* Seek bar */}
        <div className="gfull__seek-wrap">
          <div className="gfull__seek" onClick={handleSeek}>
            <div className="gfull__seek-fill" style={{ width: `${pct}%` }}>
              <div className="gfull__seek-thumb" />
            </div>
          </div>
          <div className="gfull__times">
            <span>{fmt(progress)}</span>
            <span>-{fmt(Math.max(0, duration - progress))}</span>
          </div>
        </div>

        {/* Main controls */}
        <div className="gfull__controls">
          <button className={`gfull__ctrl-sm ${shuffleOn ? 'active' : ''}`} onClick={toggleShuffle} aria-label="Перемешать">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h3.5c1.3 0 2.5.6 3.2 1.7l4.6 6.6c.7 1.1 1.9 1.7 3.2 1.7H21"/><path d="M18.5 13.5L21 16l-2.5 2.5"/><path d="M3 18h3.5c1.3 0 2.5-.6 3.2-1.7l1.2-1.7"/><path d="M13.1 9.4l1.2-1.7c.7-1.1 1.9-1.7 3.2-1.7H21"/><path d="M18.5 3.5L21 6l-2.5 2.5"/></svg>
          </button>
          <button className="gfull__ctrl" onClick={prevTrack} aria-label="Предыдущий">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
          </button>
          <button className="gfull__play" onClick={() => setPlaying(!isPlaying)} aria-label="Play/Pause">
            {isPlaying
              ? <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <button className="gfull__ctrl" onClick={nextTrack} aria-label="Следующий">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
          <button className={`gfull__ctrl-sm ${repeatOn ? 'active' : ''}`} onClick={toggleRepeat} aria-label="Повтор">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l3.5 3.5L17 10"/><path d="M4 12V10.5A4 4 0 0 1 8 6.5h12.5"/><path d="M7 21l-3.5-3.5L7 14"/><path d="M20 12v1.5a4 4 0 0 1-4 4H3.5"/></svg>
          </button>
        </div>

        {/* Bottom actions */}
        <div className="gfull__bottom">
          <button className={`gfull__action ${liked ? 'gfull__action--liked' : ''}`} onClick={() => toggleLike(currentTrack)} aria-label="Мне нравится">
            <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
          <span className="gfull__genre">{currentTrack.genre || 'Music'}</span>
        </div>

        {/* iOS Action Sheet Modal */}
        {showMenu && (
          <div className="gfull__sheet-backdrop" onClick={() => setShowMenu(false)}>
            <div className="gfull__sheet" onClick={(e) => e.stopPropagation()}>
              <div className="gfull__sheet-header">
                <span className="gfull__sheet-title">{currentTrack.title}</span>
                <span className="gfull__sheet-sub">{currentTrack.artist}</span>
              </div>
              <div className="gfull__sheet-group">
                <button className="gfull__sheet-btn" onClick={handleShare}>
                  <span>📤 Поделиться треком</span>
                </button>
                <button
                  className="gfull__sheet-btn"
                  onClick={() => {
                    toggleLike(currentTrack);
                    setShowMenu(false);
                    showToastMsg(liked ? 'Удалено из избранного' : 'Добавлено в избранное ❤️');
                  }}
                >
                  <span>{liked ? '💔 Удалить из избранного' : '❤️ Добавить в избранное'}</span>
                </button>
                <button className="gfull__sheet-btn" onClick={handleCopyName}>
                  <span>📋 Скопировать название</span>
                </button>
              </div>
              <div className="gfull__sheet-cancel">
                <button className="gfull__sheet-cancel-btn" onClick={() => setShowMenu(false)}>
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="gfull__toast">
            <span>{toast}</span>
          </div>
        )}
      </div>
    );
  }

  /* ══ Мини-бар (над TabBar) ══ */
  return (
    <div className="gbar" onClick={() => setExpanded(true)}>
      <div className="gbar__progress" style={{ width: `${pct}%` }} />
      <div className="gbar__inner">
        <div className="gbar__art">
          {art
            ? <img src={art} alt="" onError={() => setImgError(true)} />
            : <div className="gbar__art-ph">🎵</div>
          }
          {isPlaying && <div className="gbar__art-pulse" />}
        </div>
        <div className="gbar__info">
          <div className="gbar__title">{currentTrack.title}</div>
          <div className="gbar__artist">{currentTrack.artist}</div>
        </div>
        <div className="gbar__btns" onClick={(e) => e.stopPropagation()}>
          <button className="gbar__btn gbar__btn--play" onClick={() => setPlaying(!isPlaying)} aria-label="Play/Pause">
            {isPlaying
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            }
          </button>
          <button className="gbar__btn" onClick={nextTrack} aria-label="Следующий">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
          <button
            className="gbar__btn gbar__btn--close"
            onClick={() => {
              setPlaying(false);
              useMusicStore.getState().setTrack(null as any);
            }}
            aria-label="Закрыть"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalMusicBar;
