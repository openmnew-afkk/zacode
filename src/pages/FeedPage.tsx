import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import { INITIAL_FEED_POSTS } from '../data/feedPosts';
import type { FeedPost } from '../types';
import VeloraEmblem from '../components/VeloraEmblem';
import './FeedPage.css';

type FilterCategory = 'all' | 'trailer' | 'announce' | 'premiere' | 'series';

interface FilterChip {
  id: FilterCategory;
  label: string;
  icon: string;
  count: number;
}

const STORIES = [
  { id: 'post-dune-messiah', title: 'Дюна 3', avatar: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&auto=format&fit=crop&q=80', badge: '🔥 Тизер' },
  { id: 'post-cliff-booth', title: 'Клифф Бут', avatar: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&auto=format&fit=crop&q=80', badge: '🎬 Трейлер' },
  { id: 'post-batman-2', title: 'Бэтмен 2', avatar: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=200&auto=format&fit=crop&q=80', badge: '🦇 Готэм' },
  { id: 'post-stranger-things-5', title: 'Странные дела', avatar: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=200&auto=format&fit=crop&q=80', badge: '⚡ Финал' },
  { id: 'post-avengers-secret-wars', title: 'Мстители 5', avatar: 'https://images.unsplash.com/photo-1635863138275-d9b33299680b?w=200&auto=format&fit=crop&q=80', badge: '🛡 Marvel' },
  { id: 'post-shrek-5', title: 'Шрек 5', avatar: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80', badge: '🍿 2026' },
];

const CHIPS: FilterChip[] = [
  { id: 'all', label: 'Все новости', icon: '🔥', count: 6 },
  { id: 'trailer', label: 'Трейлеры с субтитрами', icon: '🎬', count: 3 },
  { id: 'announce', label: 'Громкие анонсы', icon: '⚡', count: 2 },
  { id: 'premiere', label: 'Скоро в кино', icon: '🍿', count: 2 },
  { id: 'series', label: 'Сериалы', icon: '📺', count: 1 },
];

const VIEWS_MAP: Record<string, string> = {
  'post-cliff-booth': '34.2K',
  'post-dune-messiah': '58.9K',
  'post-batman-2': '42.1K',
  'post-stranger-things-5': '89.4K',
  'post-avengers-secret-wars': '67.0K',
  'post-shrek-5': '51.3K',
};

const TAGS_MAP: Record<string, string[]> = {
  'post-cliff-booth': ['#Тарантино', '#БрэдПитт', '#Трейлер2026'],
  'post-dune-messiah': ['#ДениВильнёв', '#ТимотиШаламе', '#IMAX70mm'],
  'post-batman-2': ['#РобертПаттинсон', '#DC', '#Готэм'],
  'post-stranger-things-5': ['#Netflix', '#ОченьСтранныеДела', '#Финал'],
  'post-avengers-secret-wars': ['#Marvel', '#ДауниМладший', '#ДокторДум'],
  'post-shrek-5': ['#Шрек5', '#DreamWorks', '#Мультфильм'],
};

const FeedPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic, openLink } = useTelegram();

  const [posts] = useState<FeedPost[]>(INITIAL_FEED_POSTS);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  /* Состояние реакций */
  const [reactionsState, setReactionsState] = useState<Record<string, Record<string, { count: number; active: boolean }>>>(() => {
    try {
      const saved = localStorage.getItem('velora_feed_reactions');
      if (saved) return JSON.parse(saved);
    } catch {}
    const init: Record<string, Record<string, { count: number; active: boolean }>> = {};
    INITIAL_FEED_POSTS.forEach((p) => {
      init[p.id] = {
        fire: { count: p.reactions.fire, active: false },
        heart: { count: p.reactions.heart, active: false },
        popcorn: { count: p.reactions.popcorn, active: false },
        clap: { count: p.reactions.clap, active: false },
      };
    });
    return init;
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handleReaction = (postId: string, reactionKey: 'fire' | 'heart' | 'popcorn' | 'clap') => {
    haptic('light');
    setReactionsState((prev) => {
      const postReactions = prev[postId] || {
        fire: { count: 100, active: false },
        heart: { count: 50, active: false },
        popcorn: { count: 30, active: false },
        clap: { count: 20, active: false },
      };
      const cur = postReactions[reactionKey];
      const nextActive = !cur.active;
      const nextCount = nextActive ? cur.count + 1 : Math.max(0, cur.count - 1);

      const nextState = {
        ...prev,
        [postId]: {
          ...postReactions,
          [reactionKey]: { count: nextCount, active: nextActive },
        },
      };
      try {
        localStorage.setItem('velora_feed_reactions', JSON.stringify(nextState));
      } catch {}
      return nextState;
    });
  };

  const handleShare = (post: FeedPost) => {
    haptic('medium');
    const shareText = `🎬 ${post.title}\n\nСмотрите трейлер в VELORA Cinema:\nhttps://t.me/VeloraAppBot/app?startapp=${post.id}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/VeloraAppBot/app')}&text=${encodeURIComponent(shareText)}`;
    openLink(shareUrl);
  };

  const handleCopyLink = (post: FeedPost) => {
    haptic('light');
    const url = `https://t.me/VeloraAppBot/app?startapp=${post.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('Ссылка скопирована'));
    } else {
      showToast('Новость сохранена');
    }
  };

  const handleStoryClick = (postId: string) => {
    haptic('medium');
    setActiveVideoId(postId);
    const el = document.getElementById(postId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (filter === 'all') return true;
    return p.category === filter;
  });

  return (
    <div className="feed-page page">
      {/* ── Шапка страницы ── */}
      <header className="feed-header">
        <div className="feed-header__top">
          <div className="feed-header__brand">
            <div className="feed-header__logo">
              <VeloraEmblem size="sm" />
            </div>
            <div>
              <span className="feed-header__tag">✦ VELORA КИНОЛЕНТА</span>
              <h1 className="feed-header__title">Новости и трейлеры</h1>
            </div>
          </div>
          <button
            className="feed-header__channel-btn"
            onClick={() => openLink('https://t.me/VeloraSupport_bot')}
            title="Канал VELORA"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            <span>В Telegram</span>
          </button>
        </div>

        {/* ── Stories / Главные премьеры ── */}
        <div className="feed-stories">
          {STORIES.map((s) => (
            <button
              key={s.id}
              className="feed-story-item"
              onClick={() => handleStoryClick(s.id)}
            >
              <div className="feed-story-avatar">
                <img src={s.avatar} alt={s.title} />
                <span className="feed-story-badge">{s.badge}</span>
              </div>
              <span className="feed-story-title">{s.title}</span>
            </button>
          ))}
        </div>

        {/* ── Фильтр-чипсы категорий с количеством ── */}
        <div className="feed-chips">
          {CHIPS.map((chip) => (
            <button
              key={chip.id}
              className={`feed-chip ${filter === chip.id ? 'active' : ''}`}
              onClick={() => {
                haptic('light');
                setFilter(chip.id);
              }}
            >
              <span className="feed-chip__icon">{chip.icon}</span>
              <span className="feed-chip__label">{chip.label}</span>
              <span className="feed-chip__count">{chip.count}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ── Список постов в стиле каналов Telegram ── */}
      <main className="feed-list">
        {filteredPosts.map((post) => {
          const isVideoPlaying = activeVideoId === post.id;
          const reactions = reactionsState[post.id] || {
            fire: { count: post.reactions.fire, active: false },
            heart: { count: post.reactions.heart, active: false },
            popcorn: { count: post.reactions.popcorn, active: false },
            clap: { count: post.reactions.clap, active: false },
          };
          const views = VIEWS_MAP[post.id] || '24.5K';
          const tags = TAGS_MAP[post.id] || ['#Кино2026', '#Трейлер'];

          return (
            <article key={post.id} id={post.id} className="feed-card">
              {/* Шапка поста Telegram */}
              <div className="feed-card__meta-bar">
                <div className="feed-card__channel">
                  <div className="feed-card__channel-avatar">
                    <VeloraEmblem size="sm" />
                  </div>
                  <div className="feed-card__channel-info">
                    <div className="feed-card__channel-name">
                      <span>VELORA Cinema News</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#38bdf8">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <div className="feed-card__time-row">
                      <span className="feed-card__time">{post.timestamp}</span>
                      <span className="feed-card__views-dot">·</span>
                      <span className="feed-card__views">👁 {views}</span>
                    </div>
                  </div>
                </div>
                <span className="feed-card__badge">
                  {post.badge}
                </span>
              </div>

              {/* 16:9 Видео-плеер трейлера с русскими субтитрами */}
              <div className="feed-card__media-wrap">
                {isVideoPlaying && post.youtubeId ? (
                  <div className="feed-card__player-container">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${post.youtubeId}?autoplay=1&playsinline=1&enablejsapi=1&rel=0&modestbranding=1&cc_load_policy=1&hl=ru&cc_lang_pref=ru`}
                      className="feed-card__frame"
                      title={post.title}
                      allowFullScreen
                      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    />
                    <button
                      className="feed-card__close-video"
                      onClick={() => {
                        haptic('light');
                        setActiveVideoId(null);
                      }}
                      title="Свернуть видео"
                    >
                      ✕ Свернуть
                    </button>
                  </div>
                ) : (
                  <div
                    className="feed-card__poster-box"
                    onClick={() => {
                      haptic('medium');
                      setActiveVideoId(post.id);
                    }}
                  >
                    <img src={post.posterUrl} alt={post.title} className="feed-card__poster" loading="lazy" />
                    <div className="feed-card__poster-veil" />

                    {/* Верхние бейджи медиа */}
                    <div className="feed-card__media-badges">
                      {post.duration && (
                        <span className="feed-card__duration">
                          ⏱ {post.duration}
                        </span>
                      )}
                      {post.hasSubtitles && (
                        <span className="feed-card__sub-badge">
                          💬 Русские субтитры
                        </span>
                      )}
                    </div>

                    {/* Большая кнопка Play по центру */}
                    <div className="feed-card__play-btn">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Текстовая часть поста */}
              <div className="feed-card__content">
                <h2 className="feed-card__headline">{post.title}</h2>
                <p className="feed-card__desc">{post.description}</p>

                {/* Теги */}
                <div className="feed-card__tags">
                  {tags.map((tag) => (
                    <span key={tag} className="feed-card__tag-pill">{tag}</span>
                  ))}
                </div>

                {post.releaseDate && (
                  <div className="feed-card__release-pill">
                    <span className="feed-card__release-icon">📅</span>
                    <span className="feed-card__release-text">{post.releaseDate}</span>
                  </div>
                )}

                {post.specs && (
                  <p className="feed-card__specs">{post.specs}</p>
                )}

                {/* Реакции Telegram */}
                <div className="feed-card__reactions">
                  <button
                    className={`feed-reaction ${reactions.fire.active ? 'active' : ''}`}
                    onClick={() => handleReaction(post.id, 'fire')}
                  >
                    <span className="feed-reaction__emoji">🔥</span>
                    <span className="feed-reaction__count">{reactions.fire.count}</span>
                  </button>
                  <button
                    className={`feed-reaction ${reactions.heart.active ? 'active' : ''}`}
                    onClick={() => handleReaction(post.id, 'heart')}
                  >
                    <span className="feed-reaction__emoji">❤️</span>
                    <span className="feed-reaction__count">{reactions.heart.count}</span>
                  </button>
                  <button
                    className={`feed-reaction ${reactions.popcorn.active ? 'active' : ''}`}
                    onClick={() => handleReaction(post.id, 'popcorn')}
                  >
                    <span className="feed-reaction__emoji">🍿</span>
                    <span className="feed-reaction__count">{reactions.popcorn.count}</span>
                  </button>
                  <button
                    className={`feed-reaction ${reactions.clap.active ? 'active' : ''}`}
                    onClick={() => handleReaction(post.id, 'clap')}
                  >
                    <span className="feed-reaction__emoji">👏</span>
                    <span className="feed-reaction__count">{reactions.clap.count}</span>
                  </button>
                </div>

                {/* Кнопки действий */}
                <div className="feed-card__actions">
                  {post.movieId && (
                    <button
                      className="feed-card__btn feed-card__btn--watch"
                      onClick={() => {
                        haptic('medium');
                        navigate(`/movie/${post.movieId}`);
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Смотреть в VELORA
                    </button>
                  )}

                  <button
                    className="feed-card__btn feed-card__btn--copy"
                    onClick={() => handleCopyLink(post)}
                    title="Скопировать ссылку"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Ссылка
                  </button>

                  <button
                    className="feed-card__btn feed-card__btn--share"
                    onClick={() => handleShare(post)}
                    title="Поделиться в Telegram"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Поделиться
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </main>

      {/* Всплывающее уведомление */}
      {toastMsg && (
        <div className="feed-toast">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default FeedPage;
