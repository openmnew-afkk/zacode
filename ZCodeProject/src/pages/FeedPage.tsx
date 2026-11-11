import React, { useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { CHANGELOG, CHANGELOG_FILTERS, KIND_META } from '../data/changelog';
import type { ChangelogEntry } from '../data/changelog';
import VeloraEmblem from '../components/VeloraEmblem';
import './FeedPage.css';

interface ReactionState { count: number; active: boolean }
type ReactionsMap = Record<string, Record<string, ReactionState>>;

const REACTIONS_STORAGE = 'zenova_feed_reactions';

const FeedPage: React.FC = () => {
  const { haptic, openLink } = useTelegram();

  const [filter, setFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  /* Реакции к релизам (сохраняются локально) */
  const [reactionsState, setReactionsState] = useState<ReactionsMap>(() => {
    try {
      const saved = localStorage.getItem(REACTIONS_STORAGE);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  };

  const handleRefresh = () => {
    haptic('medium');
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('✦ У вас самая свежая версия');
    }, 600);
  };

  const reactionsFor = (entry: ChangelogEntry) => {
    const saved = reactionsState[entry.id];
    return {
      fire: saved?.fire || { count: 120 + entry.changes.length * 8, active: false },
      heart: saved?.heart || { count: 60 + entry.changes.length * 4, active: false },
      popcorn: saved?.popcorn || { count: 30 + entry.changes.length * 2, active: false },
    };
  };

  const handleReaction = (entryId: string, reactionKey: 'fire' | 'heart' | 'popcorn') => {
    haptic('light');
    setReactionsState((prev) => {
      const cur = prev[entryId]?.[reactionKey] || { count: 0, active: false };
      const nextActive = !cur.active;
      const nextState: ReactionsMap = {
        ...prev,
        [entryId]: {
          ...(prev[entryId] || {}),
          [reactionKey]: { count: cur.count + (nextActive ? 1 : -1), active: nextActive },
        },
      };
      try { localStorage.setItem(REACTIONS_STORAGE, JSON.stringify(nextState)); } catch {}
      return nextState;
    });
  };

  const handleShare = (entry: ChangelogEntry) => {
    haptic('medium');
    const shareText = `✦ ZENOVA ${entry.version} — ${entry.title}\n\n${entry.changes.map((c) => `• ${KIND_META[c.kind].label}: ${c.text}`).join('\n')}\n\nПодробности в ZENOVA Cinema`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/ZenovaAppBot/app')}&text=${encodeURIComponent(shareText)}`;
    openLink(shareUrl);
  };

  const handleCopyLink = (entry: ChangelogEntry) => {
    haptic('light');
    const url = `https://t.me/ZenovaAppBot/app?startapp=update-${entry.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('Ссылка на релиз скопирована'));
    } else {
      showToast('Ссылка скопирована');
    }
  };

  const filteredEntries = CHANGELOG.filter((e) => {
    if (filter === 'all') return true;
    return e.tags.includes(filter);
  });

  const countFor = (filterId: string) =>
    filterId === 'all'
      ? CHANGELOG.length
      : CHANGELOG.filter((e) => e.tags.includes(filterId)).length;

  return (
    <div className="feed-page page">
      {/* ── Шапка журнала ── */}
      <header className="feed-header">
        <div className="feed-header__top">
          <div className="feed-header__brand">
            <div className="feed-header__logo">
              <VeloraEmblem size="sm" />
            </div>
            <div>
              <span className="feed-header__tag">✦ ZENOVA UPDATES</span>
              <h1 className="feed-header__title">Что нового</h1>
            </div>
          </div>
          <div className="feed-header__actions">
            <button
              className={`feed-header__reload-btn ${isRefreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              title="Обновить журнал"
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

        {/* ── Фильтры по разделам ── */}
        <div className="feed-chips">
          {CHANGELOG_FILTERS.map((chip) => (
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
              <span className="feed-chip__count">{countFor(chip.id)}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ── Лента релизов ── */}
      <main className="feed-list">
        {filteredEntries.map((entry) => {
          const reactions = reactionsFor(entry);
          const isLatest = entry === CHANGELOG[0];

          return (
            <article key={entry.id} id={entry.id} className="feed-card ch-card">
              {/* Шапка карточки релиза */}
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
                    <span className="feed-card__time">{entry.date}</span>
                  </div>
                </div>

                <span className={`feed-card__badge ${isLatest ? 'ch-badge--latest' : ''}`}>
                  {isLatest ? '🟢 Свежее' : entry.icon + ' ' + entry.version}
                </span>
              </div>

              {/* Контент релиза */}
              <div className="feed-card__content">
                <div className="ch-version-row">
                  <span className="ch-version-pill">{entry.icon} {entry.version}</span>
                  {entry.tags.map((tag) => (
                    <span key={tag} className="feed-card__tag-pill">#{tag}</span>
                  ))}
                </div>

                <h2 className="feed-card__headline">{entry.title}</h2>

                {/* Цифры релиза */}
                {entry.stats && (
                  <div className="feed-card__facts-chips">
                    {entry.stats.map((s, i) => (
                      <span key={i} className="feed-card__fact-chip">
                        <b>{s.icon} {s.value}</b> {s.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Список изменений */}
                <div className="ch-list">
                  {entry.changes.map((change, i) => {
                    const meta = KIND_META[change.kind];
                    return (
                      <div key={i} className={`ch-row ${meta.cls}`}>
                        <span className="ch-row__icon">{meta.icon}</span>
                        <span className="ch-row__kind">{meta.label}</span>
                        <span className="ch-row__text">{change.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Реакции и поделиться */}
                <div className="feed-card__toolbar">
                  <div className="feed-card__reactions">
                    <button
                      className={`feed-reaction ${reactions.fire.active ? 'active' : ''}`}
                      onClick={() => handleReaction(entry.id, 'fire')}
                    >
                      🔥 <span>{reactions.fire.count}</span>
                    </button>
                    <button
                      className={`feed-reaction ${reactions.heart.active ? 'active' : ''}`}
                      onClick={() => handleReaction(entry.id, 'heart')}
                    >
                      ❤️ <span>{reactions.heart.count}</span>
                    </button>
                    <button
                      className={`feed-reaction ${reactions.popcorn.active ? 'active' : ''}`}
                      onClick={() => handleReaction(entry.id, 'popcorn')}
                    >
                      🍿 <span>{reactions.popcorn.count}</span>
                    </button>
                  </div>

                  <div className="feed-card__share-btns">
                    <button
                      className="feed-card__icon-btn"
                      onClick={() => handleCopyLink(entry)}
                      title="Скопировать ссылку на релиз"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>

                    <button
                      className="feed-card__icon-btn"
                      onClick={() => handleShare(entry)}
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
