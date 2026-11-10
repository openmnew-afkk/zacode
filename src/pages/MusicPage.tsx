import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useMusicStore, type Track } from '../store/musicStore';
import { searchMovies, getTrendingMovies } from '../api/catalog';
import type { Movie } from '../types';
import {
  getSoundtrack,
  getAlbumTracks,
  getHeardList,
  restoreHeardList,
  removeHeard,
  heardToAlbum,
  HEARD_EVENT,
  type HeardEntry,
  type SoundtrackAlbum,
} from '../services/soundtracks';
import './MusicPage.css';

/* ═══════════════════════════════════════════════════════════════════════════
 *  ZENOVA · SOUNDTRACKS
 *  Вводишь фильм → получаешь его музыку в красивом «кино-шаблоне».
 *  «Услышано в кино» — саундтреки фильмов, которые ты смотрел, сохраняются сами.
 * ═══════════════════════════════════════════════════════════════════════════ */

const ONBOARD_KEY = 'zenova_ost_onboard_v1';

interface FilmRef {
  id: string;
  title: string;
  originalTitle: string;
  poster: string;
  backdrop: string;
  year: string;
}

type Selected =
  | { film: FilmRef; status: 'loading' }
  | { film: FilmRef; status: 'empty' }
  | { film: FilmRef; status: 'ready'; album: SoundtrackAlbum; tracks: Track[] };

const filmFromMovie = (m: Movie): FilmRef => ({
  id: m.id,
  title: m.title,
  originalTitle: m.original_title || m.title,
  poster: m.poster_path,
  backdrop: m.backdrop_path || m.poster_path,
  year: (m.release_date || '').slice(0, 4),
});

const filmFromHeard = (e: HeardEntry): FilmRef => ({
  id: e.movieId,
  title: e.title,
  originalTitle: e.originalTitle,
  poster: e.poster,
  backdrop: e.backdrop,
  year: e.year,
});

const ONBOARD_SLIDES = [
  {
    icon: '🎬',
    kicker: 'МУЗЫКА ИЗ ФИЛЬМОВ',
    title: 'Любой фильм — любой саундтрек',
    text: 'Введите название фильма или сериала, и ZENOVA соберёт официальный альбом саундтрека в красивую кино-обложку.',
  },
  {
    icon: '🎧',
    kicker: 'УСЛЫШАНО В КИНО',
    title: 'Смотрите — музыка сохраняется сама',
    text: 'Начали смотреть фильм в ZENOVA? Его саундтрек автоматически появится в личном плейлисте «Услышано в кино».',
  },
  {
    icon: '✦',
    kicker: 'ВСЕГДА С ВАМИ',
    title: 'Плеер, который не мешает',
    text: 'Музыка играет поверх всего приложения. Лайкайте треки, листайте каталог и возвращайтесь к любимым темам в один тап.',
  },
];

/* Анимированный эквалайзер текущего трека */
const Eq: React.FC<{ on: boolean }> = ({ on }) => (
  <span className={`ost-eq ${on ? 'is-on' : ''}`} aria-hidden="true">
    <i /><i /><i />
  </span>
);

const MusicPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { currentTrack, isPlaying, setTrack, setPlaying, toggleLike, likedTracks } = useMusicStore();

  const [showOnboard, setShowOnboard] = useState(() => {
    try { return !localStorage.getItem(ONBOARD_KEY); } catch { return true; }
  });
  const [slide, setSlide] = useState(0);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [heard, setHeard] = useState<HeardEntry[]>(() => getHeardList());
  const [selected, setSelected] = useState<Selected | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const reqId = useRef(0);
  const templateRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  /* Тренды + восстановление «Услышано в кино» из облака */
  useEffect(() => {
    getTrendingMovies()
      .then((list) => setTrending(list.filter((m) => m.poster_path).slice(0, 14)))
      .catch(() => {});
    restoreHeardList().then(setHeard).catch(() => {});
    const sync = () => setHeard(getHeardList());
    window.addEventListener(HEARD_EVENT, sync);
    return () => window.removeEventListener(HEARD_EVENT, sync);
  }, []);

  /* Поиск фильмов с задержкой */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(() => {
      searchMovies(q, 1)
        .then((r) => setResults((r.results || []).filter((m) => m.poster_path).slice(0, 12)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 420);
    return () => window.clearTimeout(t);
  }, [query]);

  const scrollToTemplate = () => {
    window.setTimeout(() => templateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const openMovie = useCallback(async (m: Movie) => {
    haptic('medium');
    const film = filmFromMovie(m);
    const id = ++reqId.current;
    setSelected({ film, status: 'loading' });
    scrollToTemplate();
    const ost = await getSoundtrack(m);
    if (id !== reqId.current) return;
    setSelected(ost ? { film, status: 'ready', album: ost.album, tracks: ost.tracks } : { film, status: 'empty' });
  }, [haptic]);

  const openHeard = useCallback(async (e: HeardEntry) => {
    haptic('medium');
    const film = filmFromHeard(e);
    const id = ++reqId.current;
    setSelected({ film, status: 'loading' });
    scrollToTemplate();
    const album = heardToAlbum(e);
    const tracks = await getAlbumTracks(album, e.title);
    if (id !== reqId.current) return;
    setSelected(tracks.length ? { film, status: 'ready', album, tracks } : { film, status: 'empty' });
  }, [haptic]);

  const playAt = (tracks: Track[], idx: number) => {
    const t = tracks[idx];
    if (!t) return;
    haptic('light');
    if (currentTrack?.id === t.id) {
      setPlaying(!isPlaying);
      return;
    }
    setTrack(t, tracks, idx);
    setPlaying(true);
  };

  const playAll = (tracks: Track[], shuffle = false) => {
    if (!tracks.length) return;
    haptic('heavy');
    const queue = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
    setTrack(queue[0], queue, 0);
    setPlaying(true);
  };

  const finishOnboard = () => {
    haptic('medium');
    try { localStorage.setItem(ONBOARD_KEY, '1'); } catch {}
    setShowOnboard(false);
    setSlide(0);
  };

  const likedOst = useMemo(() => likedTracks.filter((t) => t.source === 'ZENOVA OST'), [likedTracks]);
  const isLiked = (id: string) => likedTracks.some((t) => t.id === id);

  const readyTracks = selected?.status === 'ready' ? selected.tracks : [];
  const templatePlaying = readyTracks.some((t) => t.id === currentTrack?.id) && isPlaying;

  return (
    <div className="ost page">
      {/* Атмосферный фон из кадра выбранного фильма */}
      <div
        className="ost-aura"
        style={selected ? { backgroundImage: `url(${selected.film.backdrop})` } : undefined}
        aria-hidden="true"
      />

      {/* ── Шапка ── */}
      <header className="ost-head">
        <div className="ost-head__copy">
          <span className="ost-head__kicker">ZENOVA · SOUND</span>
          <h1 className="ost-head__title">Саундтреки</h1>
        </div>
        <button
          type="button"
          className="ost-head__info"
          onClick={() => { haptic('light'); setShowOnboard(true); }}
          aria-label="О разделе"
        >
          ?
        </button>
      </header>

      {/* ── Поиск фильма ── */}
      <div className="ost-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Введите фильм — получите его музыку"
          enterKeyHint="search"
        />
        {query && (
          <button type="button" className="ost-search__clear" onClick={() => setQuery('')} aria-label="Очистить">✕</button>
        )}
      </div>

      {/* Результаты поиска */}
      {query.trim().length >= 2 && (
        <section className="ost-shelf">
          <div className="ost-shelf__head">
            <h2>{searching ? 'Ищем фильмы…' : results.length ? 'Выберите фильм' : 'Ничего не найдено'}</h2>
          </div>
          <div className="ost-row">
            {searching && !results.length
              ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="ost-poster ost-skel" />)
              : results.map((m) => (
                  <button key={m.id} type="button" className="ost-poster" onClick={() => openMovie(m)}>
                    <img src={m.poster_path} alt="" loading="lazy" />
                    <span className="ost-poster__title">{m.title}</span>
                    <span className="ost-poster__year">{(m.release_date || '').slice(0, 4)}</span>
                  </button>
                ))}
          </div>
        </section>
      )}

      {/* ═════════ КИНО-ШАБЛОН САУНДТРЕКА ═════════ */}
      {selected && (
        <section ref={templateRef} className={`ost-film ${templatePlaying ? 'is-playing' : ''}`}>
          <div className="ost-film__hero" style={{ backgroundImage: `url(${selected.film.backdrop})` }}>
            <div className="ost-film__shade" />
            <button type="button" className="ost-film__close" onClick={() => { haptic('light'); setSelected(null); }} aria-label="Закрыть">✕</button>

            <div className="ost-film__head">
              <div className="ost-film__vinyl">
                <span className="ost-film__disc" style={selected.status === 'ready' ? { backgroundImage: `url(${selected.album.artwork})` } : undefined} />
                <img className="ost-film__poster" src={selected.film.poster} alt="" />
              </div>
              <div className="ost-film__meta">
                <span className="ost-film__kicker">ORIGINAL SOUNDTRACK</span>
                <h2 className="ost-film__title">{selected.film.title}</h2>
                <span className="ost-film__sub">
                  {selected.status === 'ready'
                    ? `${selected.album.artist} · ${selected.tracks.length} треков${selected.album.year ? ` · ${selected.album.year}` : ''}`
                    : selected.film.year}
                </span>
              </div>
            </div>
          </div>

          {selected.status === 'loading' && (
            <div className="ost-film__body">
              <div className="ost-loading">
                <Eq on />
                <span>Собираем саундтрек…</span>
              </div>
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="ost-track ost-skel ost-skel--row" />)}
            </div>
          )}

          {selected.status === 'empty' && (
            <div className="ost-film__body ost-empty">
              <span className="ost-empty__icon">🎼</span>
              <strong>Официальный саундтрек не найден</strong>
              <small>Попробуйте оригинальное название фильма или другой фильм.</small>
            </div>
          )}

          {selected.status === 'ready' && (
            <div className="ost-film__body">
              <div className="ost-film__actions">
                <button type="button" className="ost-btn ost-btn--main" onClick={() => (templatePlaying ? setPlaying(false) : playAll(selected.tracks))}>
                  {templatePlaying ? '❚❚ Пауза' : '▶ Слушать альбом'}
                </button>
                <button type="button" className="ost-btn" onClick={() => playAll(selected.tracks, true)} aria-label="Перемешать">⤮</button>
                <button
                  type="button"
                  className="ost-btn"
                  onClick={() => { haptic('light'); navigate(`/movie/${selected.film.id}`); }}
                  aria-label="Открыть фильм"
                >
                  🎬
                </button>
              </div>

              <ol className="ost-tracks">
                {selected.tracks.map((t, i) => {
                  const active = currentTrack?.id === t.id;
                  return (
                    <li key={t.id} className={`ost-track ${active ? 'is-active' : ''}`}>
                      <button type="button" className="ost-track__main" onClick={() => playAt(selected.tracks, i)}>
                        <span className="ost-track__num">{active ? <Eq on={isPlaying} /> : String(i + 1).padStart(2, '0')}</span>
                        <span className="ost-track__copy">
                          <strong>{t.title}</strong>
                          <small>{t.artist}</small>
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`ost-track__like ${isLiked(t.id) ? 'is-on' : ''}`}
                        onClick={() => {
                          haptic('light');
                          toggleLike(t);
                          showToast(isLiked(t.id) ? 'Убрано из любимых' : '♥ Добавлено в любимые');
                        }}
                        aria-label="В любимые"
                      >
                        {isLiked(t.id) ? '♥' : '♡'}
                      </button>
                    </li>
                  );
                })}
              </ol>
              <p className="ost-note">Официальные 30-секундные превью · Apple Music</p>
            </div>
          )}
        </section>
      )}

      {/* ═════════ УСЛЫШАНО В КИНО ═════════ */}
      <section className="ost-shelf">
        <div className="ost-shelf__head">
          <h2><span className="ost-live-dot" />Услышано в кино</h2>
          {heard.length > 0 && <span className="ost-shelf__count">{heard.length}</span>}
        </div>

        {heard.length === 0 ? (
          <div className="ost-heard-empty">
            <span className="ost-heard-empty__icon">🎧</span>
            <div>
              <strong>Пока тишина</strong>
              <small>Начните смотреть фильм в ZENOVA — его саундтрек сохранится здесь автоматически.</small>
            </div>
          </div>
        ) : (
          <div className="ost-row">
            {heard.map((e) => (
              <div key={e.movieId} className="ost-heard">
                <button type="button" className="ost-heard__card" onClick={() => openHeard(e)}>
                  <span className="ost-heard__bg" style={{ backgroundImage: `url(${e.backdrop})` }} />
                  <img className="ost-heard__art" src={e.artwork} alt="" loading="lazy" />
                  <span className="ost-heard__play">▶</span>
                </button>
                <span className="ost-heard__title">{e.title}</span>
                <span className="ost-heard__sub">{e.artist}</span>
                <button
                  type="button"
                  className="ost-heard__remove"
                  onClick={() => { haptic('light'); removeHeard(e.movieId); }}
                  aria-label="Убрать"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═════════ ЛЮБИМЫЕ ТЕМЫ ═════════ */}
      {likedOst.length > 0 && (
        <section className="ost-shelf">
          <div className="ost-shelf__head">
            <h2>♥ Любимые темы</h2>
            <button type="button" className="ost-shelf__action" onClick={() => playAll(likedOst)}>▶ Все</button>
          </div>
          <ol className="ost-tracks ost-tracks--card">
            {likedOst.slice(0, 8).map((t, i) => {
              const active = currentTrack?.id === t.id;
              return (
                <li key={t.id} className={`ost-track ${active ? 'is-active' : ''}`}>
                  <button type="button" className="ost-track__main" onClick={() => playAt(likedOst, i)}>
                    <img className="ost-track__art" src={t.artwork} alt="" loading="lazy" />
                    <span className="ost-track__copy">
                      <strong>{t.title}</strong>
                      <small>{t.album || t.artist}</small>
                    </span>
                    {active && <Eq on={isPlaying} />}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* ═════════ САУНДТРЕКИ В ТРЕНДЕ ═════════ */}
      <section className="ost-shelf">
        <div className="ost-shelf__head">
          <h2>Саундтреки в тренде</h2>
        </div>
        <div className="ost-row">
          {trending.length === 0
            ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="ost-poster ost-skel" />)
            : trending.map((m) => (
                <button key={m.id} type="button" className="ost-poster" onClick={() => openMovie(m)}>
                  <img src={m.poster_path} alt="" loading="lazy" />
                  <span className="ost-poster__badge">OST</span>
                  <span className="ost-poster__title">{m.title}</span>
                </button>
              ))}
        </div>
      </section>

      {/* ═════════ ОКНО-ЗНАКОМСТВО ═════════ */}
      {showOnboard && (
        <div className="ost-onb" role="dialog" aria-modal="true">
          <div className="ost-onb__sheet">
            <div className="ost-onb__glow" aria-hidden="true" />
            <div key={slide} className="ost-onb__slide">
              <span className="ost-onb__icon">{ONBOARD_SLIDES[slide].icon}</span>
              <span className="ost-onb__kicker">{ONBOARD_SLIDES[slide].kicker}</span>
              <h3 className="ost-onb__title">{ONBOARD_SLIDES[slide].title}</h3>
              <p className="ost-onb__text">{ONBOARD_SLIDES[slide].text}</p>
            </div>
            <div className="ost-onb__dots">
              {ONBOARD_SLIDES.map((_, i) => (
                <button key={i} type="button" className={i === slide ? 'is-on' : ''} onClick={() => setSlide(i)} aria-label={`Слайд ${i + 1}`} />
              ))}
            </div>
            <button
              type="button"
              className="ost-btn ost-btn--main ost-onb__next"
              onClick={() => {
                if (slide < ONBOARD_SLIDES.length - 1) { haptic('light'); setSlide((s) => s + 1); }
                else finishOnboard();
              }}
            >
              {slide < ONBOARD_SLIDES.length - 1 ? 'Далее' : 'Начать слушать'}
            </button>
            {slide < ONBOARD_SLIDES.length - 1 && (
              <button type="button" className="ost-onb__skip" onClick={finishOnboard}>Пропустить</button>
            )}
          </div>
        </div>
      )}

      {toast && <div className="ost-toast">{toast}</div>}
    </div>
  );
};

export default MusicPage;
