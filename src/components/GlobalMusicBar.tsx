import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMusicStore } from '../store/musicStore';
import './GlobalMusicBar.css';

const AURA_PALETTES = [
  { glow: 'rgba(168, 85, 247, 0.5)', grad: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' },
  { glow: 'rgba(56, 189, 248, 0.5)', grad: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 50%, #818cf8 100%)' },
  { glow: 'rgba(16, 185, 129, 0.5)', grad: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #3b82f6 100%)' },
  { glow: 'rgba(244, 63, 94, 0.5)', grad: 'linear-gradient(135deg, #e11d48 0%, #fb7185 50%, #f59e0b 100%)' },
  { glow: 'rgba(192, 132, 252, 0.5)', grad: 'linear-gradient(135deg, #9333ea 0%, #c084fc 50%, #f472b6 100%)' },
];

const hashVal = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const GlobalMusicBar: React.FC = () => {
  const {
    currentTrack, isPlaying, progress, duration,
    setPlaying, nextTrack, prevTrack, toggleLike, isLiked,
    setProgress, setDuration, shuffleOn, repeatOn, toggleShuffle, toggleRepeat,
    closeTrack, isExpanded, setExpanded,
  } = useMusicStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [imgError, setImgError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [speed, setSpeed] = useState<number>(1.0);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const palette = useMemo(() => {
    if (!currentTrack) return AURA_PALETTES[0];
    const idx = hashVal(currentTrack.id || currentTrack.title) % AURA_PALETTES.length;
    return AURA_PALETTES[idx];
  }, [currentTrack?.id]);

  /* ── Меню трека (3 точки) ── */
  const handleShare = () => {
    setShowMenu(false);
    if (!currentTrack) return;
    const text = `Слушаю трек: ${currentTrack.title} — ${currentTrack.artist} в AURA!`;
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
      showToastMsg('Название скопировано в буфер');
    }).catch(() => {
      showToastMsg(`${currentTrack.title} — ${currentTrack.artist}`);
    });
  };

  const openYandexMusic = () => {
    setShowMenu(false);
    if (!currentTrack) return;
    const q = `${currentTrack.artist} ${currentTrack.title}`;
    window.open(`https://music.yandex.ru/search?text=${encodeURIComponent(q)}`, '_blank');
  };

  const openVkMusic = () => {
    setShowMenu(false);
    if (!currentTrack) return;
    const q = `${currentTrack.artist} ${currentTrack.title}`;
    window.open(`https://vk.com/audio?q=${encodeURIComponent(q)}`, '_blank');
  };

  const openAppleMusic = () => {
    setShowMenu(false);
    if (!currentTrack) return;
    const q = `${currentTrack.artist} ${currentTrack.title}`;
    window.open(`https://music.apple.com/us/search?term=${encodeURIComponent(q)}`, '_blank');
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
    showToastMsg(`Скорость: ${s}x`);
  };

  // Audio engine
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
    audioRef.current.playbackRate = speed;
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

  /* ══ Развёрнутый полноэкранный плеер (Slide-up modal) ══ */
  if (isExpanded) {
    return (
      <div className="gfull">
        {/* Dynamic backdrop blur */}
        {art && <div className="gfull__bg" style={{ backgroundImage: `url(${art})` }} />}
        <div className="gfull__overlay" />

        {/* Aurora glow mesh */}
        <div className="gfull__aurora" style={{ background: palette.glow }} />

        {/* Swipe handle */}
        <div className="gfull__handle" onClick={() => setExpanded(false)}>
          <div className="gfull__handle-bar" />
        </div>

        {/* Header */}
        <div className="gfull__header">
          <button className="gfull__btn-sm" onClick={() => setExpanded(false)} aria-label="Свернуть">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div className="gfull__header-center">
            <span className="gfull__now-label">AURA SOUND</span>
            <span className="gfull__quality-tag">HD 320 KBPS</span>
          </div>
          <button className="gfull__btn-sm" onClick={() => setShowMenu(true)} aria-label="Меню трека" title="Опции трека">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="6" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="18" r="1.5" fill="currentColor"/></svg>
          </button>
        </div>

        {/* Artwork with dynamic multi-color aura */}
        <div className="gfull__art-container">
          <div className="gfull__art-aura" style={{ background: palette.grad }} />
          <div className="gfull__art">
            {art ? (
              <img src={art} alt="" onError={() => setImgError(true)} />
            ) : (
              <div className="gfull__art-ph">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 17.5V6.3L20 4v11.2" /><circle cx="6.5" cy="17.5" r="2.6" /><circle cx="17.5" cy="15.2" r="2.6" /></svg>
              </div>
            )}
            <div className="gfull__art-gradient" />
          </div>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h3.5c1.3 0 2.5.6 3.2 1.7l4.6 6.6c.7 1.1 1.9 1.7 3.2 1.7H21"/><path d="M18.5 13.5L21 16l-2.5 2.5"/><path d="M3 18h3.5c1.3 0 2.5-.6 3.2-1.7l1.2-1.7"/><path d="M13.1 9.4l1.2-1.7c.7-1.1 1.9-1.7 3.2-1.7H21"/><path d="M18.5 3.5L21 6l-2.5 2.5"/></svg>
          </button>
          <button className="gfull__ctrl" onClick={prevTrack} aria-label="Предыдущий">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
          </button>
          <button className="gfull__play" onClick={() => setPlaying(!isPlaying)} aria-label="Play/Pause">
            {isPlaying ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button className="gfull__ctrl" onClick={nextTrack} aria-label="Следующий">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
          <button className={`gfull__ctrl-sm ${repeatOn ? 'active' : ''}`} onClick={toggleRepeat} aria-label="Повтор">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3l3.5 3.5L17 10"/><path d="M4 12V10.5A4 4 0 0 1 8 6.5h12.5"/><path d="M7 21l-3.5-3.5L7 14"/><path d="M20 12v1.5a4 4 0 0 1-4 4H3.5"/></svg>
          </button>
        </div>

        {/* Bottom actions: speed toggle & favorite */}
        <div className="gfull__bottom">
          <div className="gfull__speeds">
            {[0.8, 1.0, 1.25, 1.5].map((s) => (
              <button
                key={s}
                className={`gfull__speed-pill ${speed === s ? 'active' : ''}`}
                onClick={() => changeSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            className={`gfull__action ${liked ? 'gfull__action--liked' : ''}`}
            onClick={() => {
              toggleLike(currentTrack);
              showToastMsg(liked ? 'Удалено из медиатеки' : 'Сохранено в любимые треки');
            }}
            aria-label="Мне нравится"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? '#ec4899' : 'none'} stroke={liked ? '#ec4899' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>

        {/* iOS Action Sheet Modal (3 точки) */}
        {showMenu && (
          <div className="gfull__sheet-backdrop" onClick={() => setShowMenu(false)}>
            <div className="gfull__sheet" onClick={(e) => e.stopPropagation()}>
              <div className="gfull__sheet-header">
                <span className="gfull__sheet-title">{currentTrack.title}</span>
                <span className="gfull__sheet-sub">{currentTrack.artist}</span>
              </div>
              <div className="gfull__sheet-group">
                <button className="gfull__sheet-btn" onClick={handleShare}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  <span>Поделиться треком</span>
                </button>
                <button
                  className="gfull__sheet-btn"
                  onClick={() => {
                    toggleLike(currentTrack);
                    setShowMenu(false);
                    showToastMsg(liked ? 'Удалено из избранного' : 'Добавлено в избранное');
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'none' : '#ec4899'} stroke={liked ? 'currentColor' : '#ec4899'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  <span>{liked ? 'Удалить из избранного' : 'Добавить в избранное'}</span>
                </button>
                <button className="gfull__sheet-btn" onClick={handleCopyName}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  <span>Скопировать название</span>
                </button>
              </div>

              {/* Внешние сервисы */}
              <div className="gfull__sheet-group">
                <button className="gfull__sheet-btn" onClick={openYandexMusic}>
                  <span className="gfull__service-tag yandex">Я</span>
                  <span>Открыть в Яндекс Музыке</span>
                </button>
                <button className="gfull__sheet-btn" onClick={openVkMusic}>
                  <span className="gfull__service-tag vk">VK</span>
                  <span>Открыть в VK Музыке</span>
                </button>
                <button className="gfull__sheet-btn" onClick={openAppleMusic}>
                  <span className="gfull__service-tag apple"></span>
                  <span>Открыть в Apple Music</span>
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

        {/* Toast notification */}
        {toast && (
          <div className="gfull__toast">
            <span>{toast}</span>
          </div>
        )}
      </div>
    );
  }

  /* ══ Мини-капсула (над нижним меню TabBar) ══ */
  return (
    <div className="gbar" onClick={() => setExpanded(true)}>
      <div className="gbar__progress" style={{ width: `${pct}%`, background: palette.grad }} />
      <div className="gbar__inner">
        <div className="gbar__art">
          {art ? (
            <img src={art} alt="" onError={() => setImgError(true)} />
          ) : (
            <div className="gbar__art-ph">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 17.5V6.3L20 4v11.2"/><circle cx="6.5" cy="17.5" r="2.6"/><circle cx="17.5" cy="15.2" r="2.6"/></svg>
            </div>
          )}
          {isPlaying && <div className="gbar__art-pulse" style={{ borderColor: palette.glow }} />}
        </div>
        <div className="gbar__info">
          <div className="gbar__title">{currentTrack.title}</div>
          <div className="gbar__artist">{currentTrack.artist}</div>
        </div>
        <div className="gbar__btns" onClick={(e) => e.stopPropagation()}>
          <button className="gbar__btn gbar__btn--play" onClick={() => setPlaying(!isPlaying)} aria-label="Play/Pause">
            {isPlaying ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button className="gbar__btn" onClick={nextTrack} aria-label="Следующий">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
          <button
            className="gbar__btn gbar__btn--close"
            onClick={(e) => {
              e.stopPropagation();
              closeTrack();
            }}
            aria-label="Закрыть плеер"
            title="Закрыть плеер"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalMusicBar;
