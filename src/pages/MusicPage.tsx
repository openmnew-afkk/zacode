import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useMusicStore } from '../store/musicStore';
import {
  YANDEX_MOODS,
  MoodId,
  RUSSIAN_RADIO_STREAMS,
  RUSSIAN_CHART_TOP,
  RussianTrack,
} from '../data/russianHits';
import './MusicPage.css';

/* ═══════════ Типы ═══════════ */
export interface Track {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  plays: number;
  genre: string;
  streamUrl: string;
  isLiveStream?: boolean;
}

type Tab = 'wave' | 'chart' | 'live' | 'audius' | 'liked';

const APP_NAME = 'ZENOVA';

const HOSTS_FALLBACK = [
  'https://discoveryprovider.audius.co',
  'https://audius-discovery-2.altego.net',
  'https://audius-metadata-1.figment.io',
  'https://dn1.audius.l2be.net',
];

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const fmtTime = (s: number): string => {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const mapTrack = (t: any, host: string): Track => ({
  id: `au-${t.id}`,
  title: t.title ?? 'Без названия',
  artist: t.user?.name ?? 'Неизвестный артист',
  artwork: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '',
  duration: t.duration ?? 0,
  plays: t.play_count ?? 0,
  genre: t.genre || 'Full Track',
  streamUrl: `${host}/v1/tracks/${t.id}/stream?app_name=${APP_NAME}`,
});

const mapRussianTrack = (r: RussianTrack): Track => ({
  id: r.id,
  title: r.title,
  artist: r.artist,
  artwork: r.artwork,
  duration: r.duration,
  plays: 0,
  genre: r.genre,
  streamUrl: r.streamUrl,
  isLiveStream: r.isLiveStream,
});

/* ═══════════ Артворк ═══════════ */
const Artwork: React.FC<{ src: string; alt: string; className: string }> = ({ src, alt, className }) => {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className={`${className} mu-art-fallback`}>
        <div className="mu-wave-mini">
          <span /><span /><span />
        </div>
      </div>
    );
  }
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setErr(true)} />;
};

/* ═══════════ Компонент Музыки ═══════════ */
const MusicPage: React.FC = () => {
  const { haptic, openLink } = useTelegram();
  const {
    currentTrack, isPlaying, progress,
    setTrack, setPlaying,
    likedTracks, toggleLike: storeToggleLike, isLiked: storeIsLiked,
  } = useMusicStore();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('wave');
  const [activeMood, setActiveMood] = useState<MoodId>('russian');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const hostRef = useRef<string>(HOSTS_FALLBACK[0]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  /* Загрузка Audius треков (полноценные полные треки) */
  const fetchAudius = useCallback(async (limit = 35): Promise<Track[]> => {
    let host = pick(HOSTS_FALLBACK);
    try {
      const res = await fetch('https://api.audius.co', { signal: AbortSignal.timeout(4000) });
      const json = await res.json();
      if (Array.isArray(json?.data) && json.data[0]) host = json.data[0];
    } catch {}
    hostRef.current = host;
    try {
      const res = await fetch(`${host}/v1/tracks/trending?app_name=${APP_NAME}&limit=${limit}`, { signal: AbortSignal.timeout(7000) });
      if (res.ok) {
        const json = await res.json();
        return (json?.data ?? []).map((t: any) => mapTrack(t, host));
      }
    } catch {}
    return [];
  }, []);

  /* Загрузка контента в зависимости от вкладки и настроения */
  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'wave') {
        // Умная волна (Яндекс Музыка Style): подмешивает только РЕАЛЬНЫЕ студийные треки по выбранному настроению без рекламы!
        const moodFiltered = RUSSIAN_CHART_TOP.filter((t) => t.mood === activeMood || activeMood === 'russian').map(mapRussianTrack);
        const audiusTracks = await fetchAudius(20);
        setTracks([...moodFiltered, ...audiusTracks]);
      } else if (tab === 'chart') {
        // Главный хит-парад России (100% реальные песни, 0 радиорекламы)
        setTracks(RUSSIAN_CHART_TOP.map(mapRussianTrack));
      } else if (tab === 'live') {
        // 24/7 Прямой эфир FM-радиостанций
        setTracks(RUSSIAN_RADIO_STREAMS.map(mapRussianTrack));
      } else if (tab === 'audius') {
        // Международные полные треки
        const fullTracks = await fetchAudius(35);
        setTracks(fullTracks);
      } else if (tab === 'liked') {
        setTracks(likedTracks);
      }
    } catch {
      setTracks(RUSSIAN_CHART_TOP.map(mapRussianTrack));
    } finally {
      setLoading(false);
    }
  }, [tab, activeMood, likedTracks, fetchAudius]);

  useEffect(() => {
    if (!query.trim()) {
      loadContent();
    }
  }, [loadContent, query]);

  /* Поиск через студийный каталог iTunes без рекламы */
  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query.trim())}&country=RU&entity=song&limit=25`, {
          signal: AbortSignal.timeout(6000),
        });
        const data = await res.json();
        if (data?.results?.length > 0) {
          const itunesResults: Track[] = data.results.filter((r: any) => r.previewUrl).map((r: any) => ({
            id: `it-${r.trackId}`,
            title: r.trackName,
            artist: r.artistName,
            artwork: r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '600x600bb') : '',
            duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 30,
            plays: 0,
            genre: r.primaryGenreName || 'Track',
            streamUrl: r.previewUrl,
          }));
          if (itunesResults.length > 0) {
            setTracks(itunesResults);
          }
        }
      } catch {} finally {
        setLoading(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [query]);

  /* Управление воспроизведением */
  const handlePlayTrack = (track: Track, idx: number) => {
    haptic('medium');
    if (currentTrack?.id === track.id) {
      setPlaying(!isPlaying);
    } else {
      setTrack(track, tracks, idx);
      setPlaying(true);
    }
  };

  /* Переключение настроения в Моей Волне */
  const handleMoodSelect = (mood: MoodId) => {
    haptic('light');
    setActiveMood(mood);
    showToast(`Настроение: ${YANDEX_MOODS.find((m) => m.id === mood)?.label}`);
  };

  /* Фильтрация поиском */
  const displayTracks = query.trim()
    ? tracks.filter((t) =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.artist.toLowerCase().includes(query.toLowerCase()) ||
        t.genre.toLowerCase().includes(query.toLowerCase())
      )
    : tracks;

  return (
    <div className="music-page page">
      {/* ── Шапка страницы ── */}
      <header className="mu-header">
        <div className="mu-header__top">
          <div>
            <span className="mu-header__badge">✦ ЗВУК И МУЗЫКА</span>
            <h1 className="mu-header__title">Моя Волна</h1>
          </div>
          <button
            className="mu-header__reload"
            onClick={() => {
              haptic('light');
              loadContent();
            }}
            title="Обновить поток"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>


        {/* ── Переключатель настроений (Mood Selector) ── */}
        {tab === 'wave' && (
          <div className="mu-moods">
            {YANDEX_MOODS.map((m) => (
              <button
                key={m.id}
                className={`mu-mood-chip ${activeMood === m.id ? 'active' : ''}`}
                onClick={() => handleMoodSelect(m.id)}
              >
                <span className="mu-mood-chip__icon">{m.icon}</span>
                <span className="mu-mood-chip__label">{m.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Поисковая строка ── */}
        <div className="mu-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" />
          </svg>
          <input
            type="text"
            className="mu-search__input"
            placeholder="Трек, исполнитель или жанр…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="mu-search__clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        {/* ── Вкладки категорий ── */}
        <div className="mu-tabs">
          <button className={`mu-tab ${tab === 'wave' ? 'active' : ''}`} onClick={() => { haptic('light'); setTab('wave'); }}>
            🌊 Моя Волна
          </button>
          <button className={`mu-tab ${tab === 'chart' ? 'active' : ''}`} onClick={() => { haptic('light'); setTab('chart'); }}>
            🇷🇺 Чарт РФ
          </button>
          <button className={`mu-tab ${tab === 'live' ? 'active' : ''}`} onClick={() => { haptic('light'); setTab('live'); }}>
            📻 Радио 24/7
          </button>
          <button className={`mu-tab ${tab === 'audius' ? 'active' : ''}`} onClick={() => { haptic('light'); setTab('audius'); }}>
            🌍 Полные треки
          </button>
          <button className={`mu-tab ${tab === 'liked' ? 'active' : ''}`} onClick={() => { haptic('light'); setTab('liked'); }}>
            💖 Любимые ({likedTracks.length})
          </button>
        </div>
      </header>

      {/* ── Список треков ── */}
      <main className="mu-content">
        {tab === 'live' && !loading && (
          <div className="mu-live-note">
            <span>📻 Прямой эфир радиостанций в HD качестве (Record, DFM, Европа Плюс).</span>
          </div>
        )}
        {loading ? (
          <div className="mu-loading">
            <div className="mu-spinner" />
            <span>Настраиваем волну…</span>
          </div>
        ) : displayTracks.length === 0 ? (
          <div className="mu-empty">
            <p>Ничего не найдено</p>
            <span>Попробуйте изменить запрос или настроение</span>
          </div>
        ) : (
          <div className="mu-list">
            {displayTracks.map((t, i) => {
              const isCurrent = currentTrack?.id === t.id;
              const isLiked = storeIsLiked(t.id);

              return (
                <div key={t.id} className={`mu-track ${isCurrent ? 'active' : ''}`}>
                  {/* Номер / кнопка play */}
                  <button
                    className="mu-track__play-btn"
                    onClick={() => handlePlayTrack(t, i)}
                    aria-label="Воспроизвести"
                  >
                    <Artwork src={t.artwork} alt={t.title} className="mu-track__cover" />
                    <div className="mu-track__play-overlay">
                      {isCurrent && isPlaying ? (
                        <div className="mu-track__playing-bars">
                          <span /><span /><span />
                        </div>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Инфо о треке */}
                  <div className="mu-track__meta" onClick={() => handlePlayTrack(t, i)}>
                    <div className="mu-track__title-row">
                      <span className="mu-track__title">{t.title}</span>
                      {t.isLiveStream && (
                        <span className="mu-track__live-tag">Live 24/7</span>
                      )}
                    </div>
                    <div className="mu-track__sub-row">
                      <span className="mu-track__artist">{t.artist}</span>
                      <span className="mu-track__dot">·</span>
                      <span className="mu-track__genre">{t.genre}</span>
                    </div>
                  </div>

                  {/* Длительность */}
                  <span className="mu-track__duration">
                    {t.isLiveStream ? 'Эфир' : fmtTime(t.duration)}
                  </span>

                  <div className="mu-track__actions">

                    <button
                      className={`mu-track__like ${isLiked ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        haptic('medium');
                        storeToggleLike(t);
                      }}
                      title="В избранное"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={isLiked ? 'var(--accent, #fb7185)' : 'none'} stroke={isLiked ? 'var(--accent, #fb7185)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Тост уведомление */}
      {toastMsg && (
        <div className="mu-toast">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default MusicPage;
