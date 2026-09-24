import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
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
  { id: 'post-dune-messiah', title: 'Дюна 3', avatar: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80', badge: '🔥 Тизер', subtitle: 'Дени Вильнёв начал съёмки финала трилогии' },
  { id: 'post-cliff-booth', title: 'Клифф Бут', avatar: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&auto=format&fit=crop&q=80', badge: '🎬 Трейлер', subtitle: 'Брэд Питт в продолжении Тарантино' },
  { id: 'post-batman-2', title: 'Бэтмен 2', avatar: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=300&auto=format&fit=crop&q=80', badge: '🦇 Готэм', subtitle: 'Роберт Паттинсон против Суда Сов' },
  { id: 'post-peaky-blinders', title: 'Козырьки', avatar: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=300&auto=format&fit=crop&q=80', badge: '🥃 Фильм', subtitle: 'Томми Шелби возвращается в Бирмингем' },
  { id: 'post-avatar-3', title: 'Аватар 3', avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80', badge: '🌊 Пепел', subtitle: 'Джеймс Кэмерон и темная сторона на\'ви' },
  { id: 'post-stranger-things-5', title: 'Странные дела', avatar: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=300&auto=format&fit=crop&q=80', badge: '⚡ Финал', subtitle: 'Финальная схватка за Хоукинс' },
  { id: 'post-avengers-doomsday', title: 'Мстители', avatar: 'https://images.unsplash.com/photo-1635863138275-d9b33299680b?w=300&auto=format&fit=crop&q=80', badge: '🛡 Marvel', subtitle: 'Роберт Дауни-мл. в роли Доктора Дума' },
];

const CHIPS: FilterChip[] = [
  { id: 'all', label: 'Все', icon: '🔥', count: 6 },
  { id: 'trailer', label: 'Трейлеры', icon: '🎬', count: 2 },
  { id: 'announce', label: 'Анонсы', icon: '⚡', count: 3 },
  { id: 'premiere', label: 'Премьеры', icon: '🍿', count: 1 },
  { id: 'series', label: 'Сериалы', icon: '📺', count: 1 },
];

const FeedPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic, openLink } = useTelegram();

  const [posts] = useState<FeedPost[]>(INITIAL_FEED_POSTS);
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<FeedPost | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  /* Авто-перелистывание историй каждые 5 сек */
  useEffect(() => {
    if (activeStoryIndex === null) return;
    const timer = setTimeout(() => {
      if (activeStoryIndex + 1 < STORIES.length) {
        setActiveStoryIndex(activeStoryIndex + 1);
      } else {
        setActiveStoryIndex(null);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [activeStoryIndex]);

  const handleRefresh = () => {
    haptic('medium');
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Лента обновлена');
    }, 600);
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
    const shareText = `🎬 ${post.title}\n\nПодробности в VELORA Cinema:\nhttps://t.me/VeloraAppBot/app?startapp=${post.id}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/VeloraAppBot/app')}&text=${encodeURIComponent(shareText)}`;
    openLink(shareUrl);
  };

  const handleCopyLink = (post: FeedPost) => {
    haptic('light');
    const url = `https://t.me/VeloraAppBot/app?startapp=${post.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('Ссылка скопирована'));
    } else {
      showToast('Ссылка скопирована');
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (filter === 'all') return true;
    return p.category === filter;
  });

  const curStory = activeStoryIndex !== null ? STORIES[activeStoryIndex] : null;
  const curStoryPost = curStory ? posts.find((p) => p.id === curStory.id) : null;

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
              <span className="feed-header__tag">✦ VELORA JOURNAL</span>
              <h1 className="feed-header__title">Новости кино</h1>
            </div>
          </div>
          <div className="feed-header__actions">
            <button
              className={`feed-header__reload-btn ${isRefreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              title="Обновить ленту"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>
            <button
              className="feed-header__channel-btn"
              onClick={() => openLink('https://t.me/VeloraSupport_bot')}
              title="Канал в Telegram"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              <span>Telegram</span>
            </button>
          </div>
        </div>

        {/* ── Сторисы (Stories Reel) ── */}
        <div className="feed-stories">
          {STORIES.map((s, idx) => (
            <button
              key={s.id}
              className="feed-story-item"
              onClick={() => {
                haptic('medium');
                setActiveStoryIndex(idx);
              }}
            >
              <div className="feed-story-avatar">
                <img src={s.avatar} alt={s.title} loading="lazy" />
                <span className="feed-story-badge">{s.badge}</span>
              </div>
              <span className="feed-story-title">{s.title}</span>
            </button>
          ))}
        </div>

        {/* ── Фильтры категорий ── */}
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

      {/* ── Список новостей (Идеально подогнано под экран, без сдвигов) ── */}
      <main className="feed-list">
        {filteredPosts.map((post) => {
          const isVideoPlaying = activeVideoId === post.id;
          const reactions = reactionsState[post.id] || {
            fire: { count: post.reactions.fire, active: false },
            heart: { count: post.reactions.heart, active: false },
            popcorn: { count: post.reactions.popcorn, active: false },
            clap: { count: post.reactions.clap, active: false },
          };
          const views = post.views || '34K';
          const tags = post.tags || ['#Кино2026', '#Трейлер'];

          return (
            <article key={post.id} id={post.id} className="feed-card">
              {/* Шапка карточки — компактная и аккуратная */}
              <div className="feed-card__meta-bar">
                <div className="feed-card__channel">
                  <div className="feed-card__channel-avatar">
                    <VeloraEmblem size="sm" />
                  </div>
                  <div className="feed-card__channel-info">
                    <div className="feed-card__channel-name">
                      <span>VELORA</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#38bdf8">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <span className="feed-card__time">{post.timestamp}</span>
                  </div>
                </div>

                <span className="feed-card__badge">
                  {post.badge}
                </span>
              </div>

              {/* Медиа трейлера 16:9 */}
              <div className="feed-card__media-wrap">
                {isVideoPlaying && post.youtubeId ? (
                  <div className="feed-card__player-container">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${post.youtubeId}?autoplay=1&playsinline=1&enablejsapi=1&rel=0&modestbranding=1&cc_load_policy=1&hl=ru`}
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
                    >
                      ✕ Закрыть видео
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

                    <div className="feed-card__play-btn">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Текстовая часть карточки */}
              <div className="feed-card__content">
                {/* Инфо-строка: источник и просмотры */}
                <div className="feed-card__source-row">
                  <span className="feed-card__source-pill">
                    📰 {post.source.name}
                  </span>
                  <span className="feed-card__views-pill">
                    👁 {views}
                  </span>
                </div>

                <h2
                  className="feed-card__headline"
                  onClick={() => setSelectedArticle(post)}
                >
                  {post.title}
                </h2>

                <p className="feed-card__desc">{post.description}</p>

                {/* Факты-чипсы (компактные) */}
                {post.keyFacts && (
                  <div className="feed-card__facts-chips">
                    {post.keyFacts.slice(0, 3).map((f, i) => (
                      <span key={i} className="feed-card__fact-chip">
                        <b>{f.label}:</b> {f.value}
                      </span>
                    ))}
                  </div>
                )}

                {/* Теги */}
                <div className="feed-card__tags">
                  {tags.map((tag) => (
                    <span key={tag} className="feed-card__tag-pill">{tag}</span>
                  ))}
                </div>

                {/* ── Кнопки первого ряда: Читать & Трейлер / Фильм ── */}
                <div className="feed-card__primary-actions">
                  <button
                    className="feed-card__btn feed-card__btn--read"
                    onClick={() => {
                      haptic('medium');
                      setSelectedArticle(post);
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                    Читать статью
                  </button>

                  {post.movieId ? (
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
                      Смотреть
                    </button>
                  ) : post.youtubeId ? (
                    <button
                      className="feed-card__btn feed-card__btn--trailer"
                      onClick={() => {
                        haptic('medium');
                        setActiveVideoId(activeVideoId === post.id ? null : post.id);
                      }}
                    >
                      {activeVideoId === post.id ? '✕ Свернуть' : '▶ Трейлер'}
                    </button>
                  ) : null}
                </div>

                {/* ── Тулбар: Реакции + Поделиться ── */}
                <div className="feed-card__toolbar">
                  <div className="feed-card__reactions">
                    <button
                      className={`feed-reaction ${reactions.fire.active ? 'active' : ''}`}
                      onClick={() => handleReaction(post.id, 'fire')}
                    >
                      🔥 <span>{reactions.fire.count}</span>
                    </button>
                    <button
                      className={`feed-reaction ${reactions.heart.active ? 'active' : ''}`}
                      onClick={() => handleReaction(post.id, 'heart')}
                    >
                      ❤️ <span>{reactions.heart.count}</span>
                    </button>
                    <button
                      className={`feed-reaction ${reactions.popcorn.active ? 'active' : ''}`}
                      onClick={() => handleReaction(post.id, 'popcorn')}
                    >
                      🍿 <span>{reactions.popcorn.count}</span>
                    </button>
                  </div>

                  <div className="feed-card__share-btns">
                    <button
                      className="feed-card__icon-btn"
                      onClick={() => handleCopyLink(post)}
                      title="Скопировать ссылку"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>

                    <button
                      className="feed-card__icon-btn"
                      onClick={() => handleShare(post)}
                      title="Поделиться в Telegram"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </main>

      {/* ── Полноэкранный плеер историй (Stories Viewer) — Плавный, без лагов ── */}
      {curStory && (
        <div className="feed-story-viewer">
          {/* Фон с постером */}
          <div
            className="feed-story-viewer__bg"
            style={{ backgroundImage: `url(${curStory.avatar})` }}
          />
          <div className="feed-story-viewer__veil" />

          {/* Верхние полоски прогресса */}
          <div className="feed-story-viewer__progress-bars">
            {STORIES.map((_, i) => (
              <div key={i} className="feed-story-viewer__bar-bg">
                <div
                  className={`feed-story-viewer__bar-fill ${
                    i < activeStoryIndex!
                      ? 'done'
                      : i === activeStoryIndex!
                      ? 'animating'
                      : ''
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Шапка истории */}
          <div className="feed-story-viewer__header">
            <div className="feed-story-viewer__author">
              <div className="feed-story-viewer__avatar">
                <img src={curStory.avatar} alt="" />
              </div>
              <div>
                <span className="feed-story-viewer__name">{curStory.title}</span>
                <span className="feed-story-viewer__badge">{curStory.badge}</span>
              </div>
            </div>
            <button
              className="feed-story-viewer__close"
              onClick={() => setActiveStoryIndex(null)}
            >
              ✕
            </button>
          </div>

          {/* Интерактивные зоны кликов (Назад / Вперёд) */}
          <div
            className="feed-story-viewer__tap-left"
            onClick={() => {
              haptic('light');
              setActiveStoryIndex(Math.max(0, activeStoryIndex! - 1));
            }}
          />
          <div
            className="feed-story-viewer__tap-right"
            onClick={() => {
              haptic('light');
              if (activeStoryIndex! + 1 < STORIES.length) {
                setActiveStoryIndex(activeStoryIndex! + 1);
              } else {
                setActiveStoryIndex(null);
              }
            }}
          />

          {/* Нижняя карточка истории */}
          <div className="feed-story-viewer__card">
            <h2 className="feed-story-viewer__card-title">{curStory.title}</h2>
            <p className="feed-story-viewer__card-sub">{curStory.subtitle}</p>

            <div className="feed-story-viewer__card-actions">
              {curStoryPost && (
                <button
                  className="feed-story-viewer__btn feed-story-viewer__btn--primary"
                  onClick={() => {
                    const post = curStoryPost;
                    setActiveStoryIndex(null);
                    setSelectedArticle(post);
                  }}
                >
                  📖 Читать полностью
                </button>
              )}
              {curStoryPost?.movieId && (
                <button
                  className="feed-story-viewer__btn feed-story-viewer__btn--secondary"
                  onClick={() => {
                    const id = curStoryPost.movieId;
                    setActiveStoryIndex(null);
                    navigate(`/movie/${id}`);
                  }}
                >
                  🍿 Фильм
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Модальный ридер полной статьи («Читать статью») ── */}
      {selectedArticle && (
        <div className="feed-modal-backdrop" onClick={() => setSelectedArticle(null)}>
          <div className="feed-modal" onClick={(e) => e.stopPropagation()}>
            <div className="feed-modal__header">
              <div className="feed-modal__source-row">
                <span className="feed-modal__source-badge">
                  📰 {selectedArticle.source.name}
                </span>
                {selectedArticle.source.url && (
                  <button
                    className="feed-modal__source-link"
                    onClick={() => openLink(selectedArticle.source.url!)}
                  >
                    Оригинал ↗
                  </button>
                )}
              </div>
              <button
                className="feed-modal__close"
                onClick={() => setSelectedArticle(null)}
              >
                ✕
              </button>
            </div>

            <div className="feed-modal__body">
              <h1 className="feed-modal__title">{selectedArticle.title}</h1>
              <div className="feed-modal__meta">
                <span>{selectedArticle.timestamp}</span>
                <span>·</span>
                <span>👁 {selectedArticle.views || '40K'}</span>
                <span>·</span>
                <span>{selectedArticle.badge}</span>
              </div>

              {/* Медиа трейлера в модалке */}
              {selectedArticle.youtubeId && (
                <div className="feed-modal__media">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${selectedArticle.youtubeId}?playsinline=1&rel=0&modestbranding=1&cc_load_policy=1&hl=ru`}
                    className="feed-modal__frame"
                    title={selectedArticle.title}
                    allowFullScreen
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  />
                </div>
              )}

              {/* Сетка ключевых фактов */}
              {selectedArticle.keyFacts && (
                <div className="feed-modal__facts-grid">
                  <h3 className="feed-modal__facts-title">Ключевые данные:</h3>
                  <div className="feed-modal__facts-list">
                    {selectedArticle.keyFacts.map((fact, idx) => (
                      <div key={idx} className="feed-modal__fact">
                        <span className="feed-modal__fact-lbl">{fact.label}</span>
                        <span className="feed-modal__fact-val">{fact.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Цитата создателя */}
              {selectedArticle.quote && (
                <blockquote className="feed-modal__quote">
                  <p>«{selectedArticle.quote.text}»</p>
                  <footer>
                    <strong>{selectedArticle.quote.author}</strong>
                    <span>{selectedArticle.quote.role}</span>
                  </footer>
                </blockquote>
              )}

              {/* Полный текст статьи */}
              <div className="feed-modal__text">
                {selectedArticle.fullArticle && selectedArticle.fullArticle.length > 0 ? (
                  selectedArticle.fullArticle.map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))
                ) : (
                  <p>{selectedArticle.description}</p>
                )}
              </div>

              {/* Действия в модалке */}
              <div className="feed-modal__footer-actions">
                {selectedArticle.movieId && (
                  <button
                    className="feed-modal__btn feed-modal__btn--watch"
                    onClick={() => {
                      haptic('medium');
                      navigate(`/movie/${selectedArticle.movieId}`);
                    }}
                  >
                    Смотреть в каталоге
                  </button>
                )}
                <button
                  className="feed-modal__btn feed-modal__btn--share"
                  onClick={() => handleShare(selectedArticle)}
                >
                  Поделиться
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Тост */}
      {toastMsg && (
        <div className="feed-toast">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default FeedPage;
