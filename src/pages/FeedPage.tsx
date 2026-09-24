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
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* Состояние реакций */
  const [reactionsState, setReactionsState] = useState<Record<string, Record<string, { count: number; active: boolean }>>>(() => {
    try {
      const saved = localStorage.getItem('zenova_feed_reactions') || localStorage.getItem('velora_feed_reactions');
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
        localStorage.setItem('zenova_feed_reactions', JSON.stringify(nextState));
      } catch {}
      return nextState;
    });
  };

  const handleShare = (post: FeedPost) => {
    haptic('medium');
    const shareText = `🎬 ${post.title}\n\nПодробности в ZENOVA Cinema:\nhttps://t.me/ZenovaAppBot/app?startapp=${post.id}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/ZenovaAppBot/app')}&text=${encodeURIComponent(shareText)}`;
    openLink(shareUrl);
  };

  const handleCopyLink = (post: FeedPost) => {
    haptic('light');
    const url = `https://t.me/ZenovaAppBot/app?startapp=${post.id}`;
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
              <span className="feed-header__tag">✦ ZENOVA JOURNAL</span>
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
              onClick={() => openLink('https://t.me/ZenovaSupport_bot')}
              title="Канал в Telegram"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              <span>Telegram</span>
            </button>
          </div>
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
                      <span>ZENOVA</span>
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
                {isVideoPlaying ? (
                  post.rutubeId ? (
                    <div className="feed-card__player-container">
                      <div className="feed-card__player-topbar">
                        <div className="feed-card__player-tag">
                          <span className="feed-card__player-dot" />
                          <span>RuTube HD · Дубляж</span>
                        </div>
                        <div className="feed-card__player-tools">
                          {post.youtubeId && (
                            <button
                              className="feed-card__yt-quick-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                haptic('light');
                                openLink(`https://www.youtube.com/watch?v=${post.youtubeId}`);
                              }}
                              title="Открыть в приложении YouTube"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff0000">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                              </svg>
                              <span>YouTube ↗</span>
                            </button>
                          )}
                          <button
                            className="feed-card__close-video"
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic('light');
                              setActiveVideoId(null);
                            }}
                            aria-label="Закрыть видео"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <iframe
                        src={`https://rutube.ru/play/embed/${post.rutubeId}/?skinColor=6366f1`}
                        className="feed-card__frame"
                        title={post.title}
                        allowFullScreen
                        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                      />
                    </div>
                  ) : post.videoUrl ? (
                    <div className="feed-card__player-container">
                      <div className="feed-card__player-topbar">
                        <div className="feed-card__player-tag">
                          <span className="feed-card__player-dot" />
                          <span>Трейлер 1080p</span>
                        </div>
                        <div className="feed-card__player-tools">
                          <button
                            className="feed-card__close-video"
                            onClick={(e) => {
                              e.stopPropagation();
                              haptic('light');
                              setActiveVideoId(null);
                            }}
                            aria-label="Закрыть видео"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <video
                        src={post.videoUrl}
                        playsInline
                        controls
                        autoPlay
                        className="feed-card__frame"
                        poster={post.posterUrl}
                      />
                    </div>
                  ) : post.youtubeId ? (
                    <div className="feed-card__yt-box">
                      <img src={post.posterUrl} alt={post.title} className="feed-card__poster" />
                      <div className="feed-card__poster-veil" />
                      <div className="feed-card__yt-inner">
                        <div className="feed-card__yt-badge">🎬 Официальный трейлер</div>
                        <p className="feed-card__yt-text">Смотрите без входа в аккаунт и ограничений</p>
                        <div className="feed-card__yt-action-row">
                          <button
                            className="feed-card__yt-btn feed-card__yt-btn--primary"
                            onClick={() => {
                              haptic('medium');
                              openLink(`https://www.youtube.com/watch?v=${post.youtubeId}`);
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="#ff0000">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                            <span>Открыть в YouTube ↗</span>
                          </button>
                          {post.movieId && (
                            <button
                              className="feed-card__yt-btn feed-card__yt-btn--catalog"
                              onClick={() => {
                                haptic('medium');
                                navigate(`/movie/${post.movieId}`);
                              }}
                            >
                              🎬 Фильм в ZENOVA
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        className="feed-card__close-video"
                        onClick={() => setActiveVideoId(null)}
                      >
                        ✕
                      </button>
                    </div>
                  ) : null
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
                    Читать
                  </button>

                  {(post.rutubeId || post.videoUrl) ? (
                    <button
                      className={`feed-card__btn ${activeVideoId === post.id ? 'feed-card__btn--active' : 'feed-card__btn--trailer'}`}
                      onClick={() => {
                        haptic('medium');
                        setActiveVideoId(activeVideoId === post.id ? null : post.id);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      {activeVideoId === post.id ? '✕ Свернуть' : 'Трейлер HD'}
                    </button>
                  ) : post.youtubeId ? (
                    <button
                      className="feed-card__btn feed-card__btn--trailer"
                      onClick={() => {
                        haptic('medium');
                        openLink(`https://www.youtube.com/watch?v=${post.youtubeId}`);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#ff0000">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      YouTube ↗
                    </button>
                  ) : null}

                  {post.movieId && (
                    <button
                      className="feed-card__btn feed-card__btn--watch"
                      onClick={() => {
                        haptic('medium');
                        navigate(`/movie/${post.movieId}`);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Смотреть
                    </button>
                  )}
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
              {selectedArticle.rutubeId ? (
                <div className="feed-modal__media">
                  <iframe
                    src={`https://rutube.ru/play/embed/${selectedArticle.rutubeId}/?skinColor=6366f1`}
                    className="feed-modal__frame"
                    title={selectedArticle.title}
                    allowFullScreen
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  />
                  {selectedArticle.youtubeId && (
                    <div className="feed-modal__yt-quick">
                      <button
                        className="feed-modal__yt-quick-btn"
                        onClick={() => openLink(`https://www.youtube.com/watch?v=${selectedArticle.youtubeId}`)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#ff0000">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        <span>Открыть трейлер в приложении YouTube ↗</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : selectedArticle.videoUrl ? (
                <div className="feed-modal__media">
                  <video
                    src={selectedArticle.videoUrl}
                    controls
                    playsInline
                    className="feed-modal__frame"
                    poster={selectedArticle.posterUrl}
                  />
                </div>
              ) : selectedArticle.youtubeId ? (
                <div className="feed-modal__media feed-modal__media--yt-fallback">
                  <img src={selectedArticle.posterUrl} alt={selectedArticle.title} className="feed-modal__yt-poster" />
                  <div className="feed-modal__yt-veil" />
                  <div className="feed-modal__yt-box">
                    <button
                      className="feed-modal__yt-btn"
                      onClick={() => openLink(`https://www.youtube.com/watch?v=${selectedArticle.youtubeId}`)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff0000">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      <span>Смотреть трейлер в приложении YouTube ↗</span>
                    </button>
                  </div>
                </div>
              ) : null}

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
                    🎬 Смотреть фильм в ZENOVA
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
