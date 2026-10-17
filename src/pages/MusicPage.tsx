import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useMusicStore } from '../store/musicStore';
import {
  WAVE_MOODS,
  LIVE_RADIO_STATIONS,
  CURATED_TRACKS,
  MusicTrack,
  searchOnlineServices,
} from '../services/yandexWave';
import './MusicPage.css';

type Tab = 'wave' | 'chart' | 'radio' | 'library';

const fmtTime = (s: number): string => {
  if (!s || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const MusicPage: React.FC = () => {
  const { haptic } = useTelegram();
  const {
    currentTrack,
    isPlaying,
    setTrack,
    setPlaying,
    likedTracks,
    toggleLike,
    isLiked,
    setExpanded,
  } = useMusicStore();

  const [tab, setTab] = useState<Tab>('wave');
  const [activeMood, setActiveMood] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const searchDebounceRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  };

  /* Интеллектуальный поиск по локальной базе и онлайн открытому каталогу */
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const onlineTracks = await searchOnlineServices(q, 20);
        setSearchResults(onlineTracks);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [query]);

  /* Фильтрация треков для отображения */
  const displayedTracks = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Если введён поисковый запрос
    if (q) {
      const localMatches = [...CURATED_TRACKS, ...LIVE_RADIO_STATIONS].filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          (t.album && t.album.toLowerCase().includes(q)) ||
          t.genre.toLowerCase().includes(q)
      );

      // Объединяем локальные совпадения и найденные онлайн треки без дубликатов
      const combined = [...localMatches];
      searchResults.forEach((st) => {
        if (!combined.some((item) => item.title.toLowerCase() === st.title.toLowerCase() && item.artist.toLowerCase() === st.artist.toLowerCase())) {
          combined.push(st);
        }
      });
      return combined;
    }

    if (tab === 'radio') {
      return LIVE_RADIO_STATIONS;
    }

    if (tab === 'library') {
      return likedTracks as MusicTrack[];
    }

    if (tab === 'chart') {
      return CURATED_TRACKS;
    }

    // Вкладка 'wave' (Моя Волна)
    let list = [...CURATED_TRACKS, ...LIVE_RADIO_STATIONS];
    if (activeMood !== 'all') {
      list = list.filter((t) => t.mood === activeMood);
    }
    return list;
  }, [tab, activeMood, query, likedTracks, searchResults]);

  /* Запуск воспроизведения трека */
  const handlePlayTrack = (track: MusicTrack, idx: number) => {
    haptic('medium');
    if (currentTrack?.id === track.id) {
      setPlaying(!isPlaying);
    } else {
      setTrack(track as any, displayedTracks as any[], idx);
      setPlaying(true);
    }
  };

  /* Запуск Моей Волны по большой кнопке/сфере */
  const handleStartWave = () => {
    haptic('heavy');
    if (displayedTracks.length > 0) {
      const first = displayedTracks[0];
      setTrack(first as any, displayedTracks as any[], 0);
      setPlaying(true);
      const mood = WAVE_MOODS.find((m) => m.id === activeMood);
      showToast(`🌊 Моя Волна запущена: ${mood?.label || 'Персональный поток'}`);
    }
  };

  const currentMoodObj = WAVE_MOODS.find((m) => m.id === activeMood) || WAVE_MOODS[0];

  return (
    <div className="music-page page ym-music-page">
      {/* ── Премиальная шапка в стиле Яндекс Музыки ── */}
      <header className="ym-header">
        <div className="ym-header__top">
          <div className="ym-brand">
            <div className="ym-brand__badge-row">
              <span className="ym-brand__badge">✦ МОЯ ВОЛНА · ЯНДЕКС СТИЛЬ</span>
              <span className="ym-source-tag">ZENOVA SOUND</span>
            </div>
            <h1 className="ym-brand__title">
              {tab === 'wave' && 'Моя Волна'}
              {tab === 'chart' && 'Топ Чарты'}
              {tab === 'radio' && 'Прямой Эфир'}
              {tab === 'library' && 'Коллекция'}
            </h1>
          </div>

          <div
            className={`ym-header__equalizer ${isPlaying ? 'playing' : ''}`}
            onClick={() => currentTrack && setExpanded(true)}
            title={currentTrack ? 'Развернуть плеер' : undefined}
          >
            <span /><span /><span /><span />
          </div>
        </div>

        {/* ── Умный поисковик ── */}
        <div className="ym-search">
          <svg className="ym-search__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" />
          </svg>
          <input
            type="text"
            className="ym-search__input"
            placeholder="Трек, исполнитель, радио или саундтрек…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isSearching && (
            <div className="ym-search__spinner" />
          )}
          {query && !isSearching && (
            <button
              className="ym-search__clear"
              onClick={() => setQuery('')}
              aria-label="Очистить поиск"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Навигационные вкладки сервиса ── */}
        <div className="ym-tabs">
          <button
            className={`ym-tab ${tab === 'wave' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setTab('wave'); }}
          >
            <span className="ym-tab__icon">🌊</span>
            <span>Моя Волна</span>
          </button>
          <button
            className={`ym-tab ${tab === 'chart' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setTab('chart'); }}
          >
            <span className="ym-tab__icon">🔥</span>
            <span>Топ Хиты</span>
          </button>
          <button
            className={`ym-tab ${tab === 'radio' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setTab('radio'); }}
          >
            <span className="ym-tab__icon">📻</span>
            <span>Радио 24/7</span>
          </button>
          <button
            className={`ym-tab ${tab === 'library' ? 'active' : ''}`}
            onClick={() => { haptic('light'); setTab('library'); }}
          >
            <span className="ym-tab__icon">💖</span>
            <span>Любимое ({likedTracks.length})</span>
          </button>
        </div>

        {/* ── Селектор настроений Моей Волны ── */}
        {tab === 'wave' && !query && (
          <div className="ym-moods">
            {WAVE_MOODS.map((m) => (
              <button
                key={m.id}
                className={`ym-mood-chip ${activeMood === m.id ? 'active' : ''}`}
                onClick={() => {
                  haptic('light');
                  setActiveMood(m.id);
                  showToast(`${m.icon} Режим Волны: ${m.label}`);
                }}
              >
                <span className="ym-mood-chip__icon">{m.icon}</span>
                <span className="ym-mood-chip__label">{m.label}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Интерактивная живая сфера "Моя Волна" в стиле Яндекс Музыки ── */}
      {tab === 'wave' && !query && (
        <section className="ym-wave-card" onClick={handleStartWave}>
          <div className="ym-wave-sphere-wrap">
            <div
              className={`ym-wave-sphere ${isPlaying ? 'playing' : ''}`}
              style={{ background: currentMoodObj.gradient }}
            >
              <div className="ym-wave-glow" />
              <div className="ym-wave-pulse" />
              <div className="ym-wave-center-icon">
                {isPlaying ? (
                  <div className="ym-wave-equalizer">
                    <span /><span /><span /><span />
                  </div>
                ) : (
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="#ffffff">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </div>
            </div>
          </div>
          <div className="ym-wave-card__info">
            <span className="ym-wave-card__badge">
              {currentMoodObj.icon} {currentMoodObj.label}
            </span>
            <h2 className="ym-wave-card__title">
              {isPlaying ? 'Волна звучит сейчас' : 'Включить Мою Волну'}
            </h2>
            <p className="ym-wave-card__desc">{currentMoodObj.description}</p>
          </div>
        </section>
      )}

      {/* ── Баннер радиостанций ── */}
      {tab === 'radio' && !query && (
        <div className="ym-radio-banner">
          <div className="ym-radio-banner__icon">📻</div>
          <div className="ym-radio-banner__content">
            <strong>Прямой эфир топ-радиостанций в HD качестве</strong>
            <p>100% стабильные открытые HTTPS-потоки без задержек и рекламы 24/7.</p>
          </div>
        </div>
      )}

      {/* ── Баннер библиотеки избранного ── */}
      {tab === 'library' && !query && (
        <div className="ym-library-banner">
          <div className="ym-library-banner__icon">💖</div>
          <div className="ym-library-banner__content">
            <strong>Ваша персональная медиатека</strong>
            <p>{likedTracks.length > 0 ? `Сохранено ${likedTracks.length} треков` : 'Нажимайте на сердечко у любого трека, чтобы добавить его сюда'}</p>
          </div>
        </div>
      )}

      {/* ── Список треков / Результаты поиска ── */}
      <main className="ym-list">
        {query && (
          <div className="ym-list-header">
            <span className="ym-list-header__title">
              {isSearching ? 'Ищем по сервисам…' : `Найдено треков: ${displayedTracks.length}`}
            </span>
          </div>
        )}

        {displayedTracks.length === 0 ? (
          <div className="ym-empty">
            <div className="ym-empty__icon">🎵</div>
            <p className="ym-empty__title">Ничего не найдено</p>
            <span className="ym-empty__sub">
              {tab === 'library'
                ? 'Вы пока не сохранили ни одного трека в любимые'
                : 'Попробуйте изменить запрос или выберите другое настроение'}
            </span>
          </div>
        ) : (
          displayedTracks.map((t, idx) => {
            const isCurrent = currentTrack?.id === t.id;
            const liked = isLiked(t.id);

            return (
              <div
                key={t.id}
                className={`ym-track ${isCurrent ? 'active' : ''}`}
                onClick={() => handlePlayTrack(t, idx)}
              >
                {/* Номер в чарте для Топ-100 */}
                {tab === 'chart' && !query && (
                  <div className={`ym-track__rank ${idx < 3 ? 'ym-track__rank--top' : ''}`}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>
                )}

                {/* Обложка с кнопкой Play и эквалайзером */}
                <div className="ym-track__art-wrap">
                  <img
                    src={t.artwork}
                    alt={t.title}
                    className="ym-track__art"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className={`ym-track__overlay ${isCurrent ? 'force-show' : ''}`}>
                    {isCurrent && isPlaying ? (
                      <div className="ym-track__bars">
                        <span /><span /><span />
                      </div>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Метаданные трека */}
                <div className="ym-track__meta">
                  <div className="ym-track__title-row">
                    <span className="ym-track__title">{t.title}</span>
                    {t.isLiveRadio && (
                      <span className="ym-badge-live">Live</span>
                    )}
                    {t.source === 'itunes' && (
                      <span className="ym-badge-source ym-badge-source--apple">Apple</span>
                    )}
                    {t.source === 'yandex' && (
                      <span className="ym-badge-source ym-badge-source--ym">Яндекс</span>
                    )}
                    {t.source === 'radio' && (
                      <span className="ym-badge-source ym-badge-source--radio">FM HD</span>
                    )}
                  </div>
                  <div className="ym-track__sub">
                    <span className="ym-track__artist">{t.artist}</span>
                    {t.genre && (
                      <>
                        <span className="ym-track__dot">·</span>
                        <span className="ym-track__genre">{t.genre}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Длительность или статус эфира */}
                <span className="ym-track__dur">
                  {t.isLiveRadio ? 'Эфир' : fmtTime(t.duration)}
                </span>

                {/* Кнопка "Мне нравится" (сердечко) */}
                <button
                  className={`ym-track__like ${liked ? 'liked' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic('medium');
                    toggleLike(t as any);
                    showToast(liked ? 'Удалено из медиатеки' : 'Добавлено в Мою Коллекцию 💖');
                  }}
                  aria-label="Мне нравится"
                >
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill={liked ? 'var(--accent, #fb7185)' : 'none'}
                    stroke={liked ? 'var(--accent, #fb7185)' : 'currentColor'}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </main>

      {/* Быстрое тост-уведомление */}
      {toastMsg && (
        <div className="ym-toast">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default MusicPage;
