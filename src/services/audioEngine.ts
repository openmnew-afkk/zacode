/* ===== Global Audio Engine — надёжный одиночный аудиоплеер ===== */

type AudioEventCallback = () => void;
type AudioTimeCallback = (time: number) => void;
type AudioDurationCallback = (duration: number) => void;

class GlobalAudioEngine {
  private audio: HTMLAudioElement | null = null;
  private currentUrl = '';
  private onEndCallbacks = new Set<AudioEventCallback>();
  private onTimeCallbacks = new Set<AudioTimeCallback>();
  private onDurationCallbacks = new Set<AudioDurationCallback>();

  private init() {
    if (this.audio) return this.audio;
    const a = new Audio();
    a.preload = 'auto';

    a.addEventListener('ended', () => {
      this.onEndCallbacks.forEach((cb) => cb());
    });

    a.addEventListener('timeupdate', () => {
      const cur = a.currentTime || 0;
      this.onTimeCallbacks.forEach((cb) => cb(cur));
    });

    a.addEventListener('durationchange', () => {
      const dur = a.duration || 0;
      this.onDurationCallbacks.forEach((cb) => cb(dur));
    });

    this.audio = a;
    return a;
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

  playTrack(url: string, speed = 1.0): Promise<void> {
    const a = this.init();

    // Если этот же трек уже загружен — просто возобновляем
    if (this.currentUrl === url && a.src) {
      a.playbackRate = speed;
      return a.play().catch(() => {});
    }

    // Полная остановка предыдущего потока, чтобы звуки не накладывались
    try {
      a.pause();
      a.currentTime = 0;
    } catch {}

    this.currentUrl = url;
    a.src = url;
    a.playbackRate = speed;
    return a.play().catch(() => {});
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
      return this.audio.play().catch(() => {});
    }
    return Promise.resolve();
  }

  /** Полный сброс и освобождение аудиобуфера */
  stop() {
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch {}
    }
    this.currentUrl = '';
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
