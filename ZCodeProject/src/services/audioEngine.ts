/* ===== Global Audio Engine — надёжный одиночный аудиоплеер с MediaSession ===== */

type AudioEventCallback = () => void;
type AudioTimeCallback = (time: number) => void;
type AudioDurationCallback = (duration: number) => void;
type AudioErrorCallback = (err: any) => void;

export interface TrackMetadata {
  title: string;
  artist: string;
  album?: string;
  artwork: string;
}

class GlobalAudioEngine {
  private audio: HTMLAudioElement | null = null;
  private currentUrl = '';
  private onEndCallbacks = new Set<AudioEventCallback>();
  private onTimeCallbacks = new Set<AudioTimeCallback>();
  private onDurationCallbacks = new Set<AudioDurationCallback>();
  private onErrorCallbacks = new Set<AudioErrorCallback>();
  private onNextCallback: (() => void) | null = null;
  private onPrevCallback: (() => void) | null = null;
  private onPlayPauseCallback: ((playing: boolean) => void) | null = null;
  private currentMeta: TrackMetadata | null = null;
  private fallbackUrl: string | null = null;
  private hasTriedFallback = false;
  private isChangingTrack = false;

  private init() {
    if (this.audio) return this.audio;
    const a = new Audio();
    a.preload = 'auto';
    // Настройки для мобильного WebKit / Telegram WebApp
    (a as any).playsInline = true;
    a.setAttribute('playsinline', 'true');
    a.setAttribute('webkit-playsinline', 'true');

    a.addEventListener('ended', () => {
      if (this.isChangingTrack) return;
      this.onEndCallbacks.forEach((cb) => cb());
    });

    a.addEventListener('timeupdate', () => {
      const cur = a.currentTime || 0;
      this.onTimeCallbacks.forEach((cb) => cb(cur));
      this.updateMediaSessionPosition(cur, a.duration || 0);
    });

    a.addEventListener('durationchange', () => {
      const dur = a.duration || 0;
      this.onDurationCallbacks.forEach((cb) => cb(dur));
    });

    a.addEventListener('play', () => {
      this.setMediaSessionPlaybackState('playing');
      this.onPlayPauseCallback?.(true);
    });

    a.addEventListener('pause', () => {
      // Игнорируем технические паузы при смене трека, чтобы не ломать глобальный стейт
      if (this.isChangingTrack) return;
      this.setMediaSessionPlaybackState('paused');
      this.onPlayPauseCallback?.(false);
    });

    a.addEventListener('error', (e) => {
      if (this.isChangingTrack && !a.currentSrc) return;
      console.warn('Audio playback error', e);
      if (!this.hasTriedFallback && this.fallbackUrl && this.fallbackUrl !== this.currentUrl) {
        this.tryFallback(a.playbackRate || 1.0, e).catch(() => {});
        return;
      }
      this.onErrorCallbacks.forEach((cb) => cb(e));
    });

    this.setupMediaSessionHandlers();

    this.audio = a;
    return a;
  }

  /* ═══ Подключение MediaSession API (шторка iOS/Android и Lock Screen) ═══ */
  private setupMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        this.resume();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.onPrevCallback?.();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.onNextCallback?.();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && isFinite(details.seekTime)) {
          this.seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(this.getCurrentTime() + offset);
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(Math.max(0, this.getCurrentTime() - offset));
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        this.stop();
      });
    } catch (err) {
      console.debug('MediaSession handlers init error:', err);
    }
  }

  public setNavigationHandlers(onNext: () => void, onPrev: () => void, onPlayPause?: (p: boolean) => void) {
    this.onNextCallback = onNext;
    this.onPrevCallback = onPrev;
    if (onPlayPause) this.onPlayPauseCallback = onPlayPause;
  }

  public updateMetadata(meta: TrackMetadata) {
    this.currentMeta = meta;
    if (!('mediaSession' in navigator)) return;

    try {
      const art = meta.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: meta.title || 'ZENOVA Sound',
        artist: meta.artist || 'Неизвестный исполнитель',
        album: meta.album || 'ZENOVA Волна',
        artwork: [
          { src: art, sizes: '96x96', type: 'image/jpeg' },
          { src: art, sizes: '128x128', type: 'image/jpeg' },
          { src: art, sizes: '192x192', type: 'image/jpeg' },
          { src: art, sizes: '256x256', type: 'image/jpeg' },
          { src: art, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    } catch {}
  }

  private setMediaSessionPlaybackState(state: 'playing' | 'paused' | 'none') {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = state;
      } catch {}
    }
  }

  private updateMediaSessionPosition(currentTime: number, duration: number) {
    if (!('mediaSession' in navigator) || !duration || duration <= 0 || !isFinite(duration)) return;
    try {
      if ('setPositionState' in navigator.mediaSession) {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: this.audio?.playbackRate || 1.0,
          position: Math.max(0, Math.min(currentTime, duration)),
        });
      }
    } catch {}
  }

  onError(cb: AudioErrorCallback) {
    this.onErrorCallbacks.add(cb);
    return () => this.onErrorCallbacks.delete(cb);
  }

  onEnded(cb: AudioEventCallback) {
    this.onEndCallbacks.add(cb);
    return () => this.onEndCallbacks.delete(cb);
  }

  onTimeUpdate(cb: AudioTimeCallback) {
    this.onTimeCallbacks.add(cb);
    return () => this.onTimeCallbacks.delete(cb);
  }

  onDurationChange(cb: AudioDurationCallback) {
    this.onDurationCallbacks.add(cb);
    return () => this.onDurationCallbacks.delete(cb);
  }

  playTrack(url: string, speed = 1.0, metadata?: TrackMetadata, fallbackUrl?: string): Promise<void> {
    const a = this.init();
    this.fallbackUrl = fallbackUrl || null;
    this.hasTriedFallback = false;

    if (metadata) {
      this.updateMetadata(metadata);
    }

    // Если этот же трек уже загружен — просто возобновляем воспроизведение
    if (this.currentUrl === url && a.src) {
      a.playbackRate = speed;
      return a.play().catch((err) => {
        if (err?.name === 'AbortError') return;
        if (err?.name === 'NotAllowedError') {
          this.onPlayPauseCallback?.(false);
          return;
        }
        return this.tryFallback(speed, err);
      });
    }

    this.isChangingTrack = true;
    this.currentUrl = url;
    a.src = url;
    a.playbackRate = speed;

    return a.play()
      .then(() => {
        this.isChangingTrack = false;
      })
      .catch((err) => {
        this.isChangingTrack = false;
        if (err?.name === 'AbortError') {
          return;
        }
        if (err?.name === 'NotAllowedError') {
          this.onPlayPauseCallback?.(false);
          return;
        }
        console.warn('Playback play() promise rejected:', err);
        return this.tryFallback(speed, err);
      });
  }

  private tryFallback(speed: number, originalErr: any): Promise<void> {
    if (originalErr?.name === 'AbortError') return Promise.resolve();
    if (!this.hasTriedFallback && this.fallbackUrl && this.fallbackUrl !== this.currentUrl && this.audio) {
      this.hasTriedFallback = true;
      console.info('Switching to fallback audio stream:', this.fallbackUrl);
      this.currentUrl = this.fallbackUrl;
      this.isChangingTrack = true;
      this.audio.src = this.fallbackUrl;
      this.audio.playbackRate = speed;
      return this.audio.play()
        .then(() => {
          this.isChangingTrack = false;
        })
        .catch((fallbackErr) => {
          this.isChangingTrack = false;
          if (fallbackErr?.name === 'AbortError') return;
          console.warn('Fallback stream also rejected:', fallbackErr);
          this.onErrorCallbacks.forEach((cb) => cb(fallbackErr));
          return Promise.reject(fallbackErr);
        });
    }
    this.onErrorCallbacks.forEach((cb) => cb(originalErr));
    return Promise.reject(originalErr);
  }

  pause() {
    if (this.audio) {
      try {
        this.audio.pause();
      } catch {}
    }
  }

  resume(): Promise<void> {
    if (this.audio && this.audio.src) {
      return this.audio.play().catch((err) => {
        if (err?.name === 'AbortError') return;
        if (err?.name === 'NotAllowedError') {
          this.onPlayPauseCallback?.(false);
          return;
        }
      });
    }
    return Promise.resolve();
  }

  /** Полный сброс и освобождение аудиобуфера */
  stop() {
    this.fallbackUrl = null;
    this.hasTriedFallback = false;
    this.isChangingTrack = false;
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch {}
    }
    this.currentUrl = '';
    this.setMediaSessionPlaybackState('none');
  }

  seek(time: number) {
    if (this.audio && isFinite(time)) {
      try {
        this.audio.currentTime = time;
      } catch {}
    }
  }

  setSpeed(speed: number) {
    if (this.audio && isFinite(speed) && speed > 0) {
      try {
        this.audio.playbackRate = speed;
      } catch {}
    }
  }

  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  getDuration(): number {
    return this.audio?.duration || 0;
  }
}

export const audioEngine = new GlobalAudioEngine();

