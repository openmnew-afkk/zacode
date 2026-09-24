import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import {
  getStoredGrants, grantAccessToUser, revokeUserAccess, extendUserAccess,
  generateVipToken, syncFromCloud, resolveUserAccess, MASTER_ADMINS,
  type UserGrant, type UserRole, type DurationOption
} from '../services/accessControl';
import VeloraEmblem from '../components/VeloraEmblem';
import './AdminPage.css';

type AdminTab = 'users' | 'servers' | 'broadcast' | 'finances' | 'backup';

const ROLE_LABELS: Record<UserRole, { label: string; badge: string; color: string; icon: string }> = {
  admin: { label: 'Администратор', badge: 'ADMIN', color: '#ec4899', icon: '👑' },
  moderator: { label: 'Модератор', badge: 'MOD', color: '#38bdf8', icon: '🛡️' },
  vip: { label: 'VIP Премиум', badge: 'VIP PASS', color: '#fbbf24', icon: '🌟' },
  user: { label: 'Пользователь', badge: 'USER', color: '#94a3b8', icon: '👤' },
};

const DURATION_OPTIONS: Array<{ id: DurationOption; label: string }> = [
  { id: 'forever', label: '🌟 Навсегда (Бессрочно)' },
  { id: '30d', label: '💎 30 дней' },
  { id: '7d', label: '⚡ 7 дней' },
  { id: '5d', label: '⭐ 5 дней' },
  { id: '2d', label: '🎁 2 дня (Тест)' },
  { id: '365d', label: '🏆 1 год' },
];

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { haptic, showBackButton } = useTelegram();
  const {
    isAdmin, adminLogin, adminLogout, telegramUsername,
    announcement, setAnnouncement, adsEnabled, setAdsEnabled,
    requisites, prices, activatePremiumForever,
  } = useStore();

  /* Авторизация */
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  /* Текущая активная вкладка */
  const [tab, setTab] = useState<AdminTab>('users');

  /* Список пользователей и грантов */
  const [grants, setGrants] = useState<UserGrant[]>(() => getStoredGrants());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  /* Форма выдачи по никнейму */
  const [targetUsername, setTargetUsername] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('vip');
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>('30d');
  const [grantNote, setGrantNote] = useState('');
  const [actionNotice, setActionNotice] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

  /* Объявление */
  const [bannerText, setBannerText] = useState(announcement);
  const [bannerActive, setBannerActive] = useState(!!announcement);

  /* Реквизиты */
  const [card, setCard] = useState(requisites.card);
  const [sbp, setSbp] = useState(requisites.sbp);
  const [crypto, setCrypto] = useState(requisites.crypto);

  /* Проверка прав пользователя */
  const currentAccess = resolveUserAccess(telegramUsername);
  const isAuthorized = isAdmin || currentAccess.isAdmin || currentAccess.isModerator;

  // Автоматический вход для супер-админов из мастер-списка
  useEffect(() => {
    if (currentAccess.isAdmin && !isAdmin) {
      adminLogin('Kodik987412365').catch(() => {});
    }
  }, [currentAccess.isAdmin, isAdmin, adminLogin]);

  // Telegram Back Button
  useEffect(() => {
    const cleanup = showBackButton?.(() => {
      haptic?.('light');
      navigate('/profile');
    });
    return () => cleanup?.();
  }, [showBackButton, navigate, haptic]);

  // Фоновая синхронизация с бесплатным облачным хранилищем
  useEffect(() => {
    if (isAuthorized) {
      syncFromCloud().then((updated) => setGrants(updated));
    }
  }, [isAuthorized]);

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    haptic?.('medium');
    setActionNotice({ msg, type });
    setTimeout(() => setActionNotice(null), 4500);
  };

  /* Обработка ручного входа по паролю */
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    await new Promise((r) => setTimeout(r, 400));
    const ok = await adminLogin(password);
    setAuthLoading(false);
    if (ok) {
      setPassword('');
      showToast('Вход в панель администратора выполнен!', 'success');
    } else {
      setAuthError('Неверный ключ доступа');
      haptic?.('heavy');
    }
  };

  /* Выдача прав по никнейму */
  const handleGrant = () => {
    if (!targetUsername.trim()) {
      showToast('Введите Telegram @username', 'error');
      return;
    }
    const res = grantAccessToUser(
      targetUsername,
      selectedRole,
      selectedDuration,
      telegramUsername || 'MikySauce',
      grantNote
    );
    if (res) {
      const updated = getStoredGrants();
      setGrants(updated);
      setTargetUsername('');
      setGrantNote('');
      showToast(`Права ${ROLE_LABELS[selectedRole].label} успешно выданы для ${res.displayName}!`, 'success');
    }
  };

  /* Продление доступа */
  const handleExtend = (username: string) => {
    const res = extendUserAccess(username, 30);
    if (res) {
      setGrants(getStoredGrants());
      showToast(`Доступ для @${username} продлён на 30 дней!`, 'success');
    }
  };

  /* Отзыв прав */
  const handleRevoke = (username: string) => {
    revokeUserAccess(username);
    setGrants(getStoredGrants());
    showToast(`Права для @${username} отозваны!`, 'info');
  };

  /* Генерация и копирование токена */
  const handleCopyToken = (username: string, role: UserRole, dur: DurationOption) => {
    const token = generateVipToken(username, role, dur);
    const link = `https://t.me/VeloraAppBot/app?startapp=token_${token}`;
    navigator.clipboard?.writeText(link).then(() => {
      showToast(`VIP-ссылка для @${username} скопирована в буфер обмена!`, 'success');
    }).catch(() => {
      showToast(`Токен: ${token}`, 'info');
    });
  };

  /* Экспорт базы данных */
  const handleExportJson = () => {
    const data = JSON.stringify(grants, null, 2);
    navigator.clipboard?.writeText(data).then(() => {
      showToast('База пользователей скопирована в формате JSON!', 'success');
    });
  };

  /* Импорт базы данных */
  const handleImportJson = () => {
    const raw = prompt('Вставьте JSON-массив пользователей:');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localStorage.setItem('velora_access_registry_v2', JSON.stringify(parsed));
        setGrants(parsed);
        showToast(`Успешно импортировано ${parsed.length} пользователей!`, 'success');
      }
    } catch {
      showToast('Ошибка: некорректный формат JSON', 'error');
    }
  };

  /* Сохранение объявления */
  const handleSaveBroadcast = () => {
    setAnnouncement(bannerActive ? bannerText : '');
    showToast('Глобальное объявление обновлено!', 'success');
  };

  /* Фильтрация списка пользователей */
  const filteredGrants = useMemo(() => {
    return grants.filter((g) => {
      const matchesSearch = !searchQuery || g.username.includes(searchQuery.toLowerCase()) || g.displayName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || g.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [grants, searchQuery, roleFilter]);

  /* ═══ Экран авторизации (если никнейм не из списка админов) ═══ */
  if (!isAuthorized) {
    return (
      <div className="adm page">
        <div className="adm-login-wrap">
          <VeloraEmblem size="lg" className="adm-login-emblem" />
          <h1 className="adm-login-title">VELORA Control</h1>
          <p className="adm-login-desc">
            Авторизация администратора системы. Если ваш никнейм зарегистрирован, доступ предоставляется автоматически.
          </p>

          <form className="adm-login-card" onSubmit={handlePasswordLogin}>
            <div className="adm-field">
              <label className="adm-field__label">Мастер-ключ администратора</label>
              <input
                className="adm-field__input"
                type="password"
                placeholder="Введите ключ доступа…"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>

            {authError && <div className="adm-alert adm-alert--error">{authError}</div>}

            <button className="adm-btn adm-btn--primary" type="submit" disabled={authLoading || !password}>
              {authLoading ? 'Проверка прав…' : 'Войти в панель'}
            </button>
          </form>

          <button className="adm-login-back" onClick={() => navigate('/profile')}>
            ← Вернуться в профиль
          </button>
        </div>
      </div>
    );
  }

  /* ═══ Основная панель управления ═══ */
  return (
    <div className="adm page">
      {/* Шапка с градиентом и статусом */}
      <header className="adm-header">
        <div className="adm-header__top">
          <div className="adm-header__brand">
            <VeloraEmblem size="sm" />
            <div>
              <div className="adm-badge">VELORA MASTER PANEL</div>
              <h1 className="adm-title">Управление доступом</h1>
            </div>
          </div>
          <button className="adm-btn-exit" onClick={() => { adminLogout(); navigate('/profile'); }} title="Выход">
            Выйти
          </button>
        </div>

        <div className="adm-session-bar">
          <div className="adm-session-user">
            <span className="adm-session-dot" />
            <span>Сессия: <strong>@{telegramUsername || 'MikySauce'}</strong> (Супер-Администратор)</span>
          </div>
          <span className="adm-session-tag">Без серверов и API</span>
        </div>
      </header>

      {/* KPI Метрики */}
      <div className="adm-metrics">
        <div className="adm-metric">
          <span className="adm-metric__icon">👑</span>
          <div className="adm-metric__val">{MASTER_ADMINS.length + grants.filter(g => g.role === 'admin').length}</div>
          <div className="adm-metric__lbl">Администраторы</div>
        </div>
        <div className="adm-metric">
          <span className="adm-metric__icon">💎</span>
          <div className="adm-metric__val">{grants.filter(g => g.role === 'vip').length}</div>
          <div className="adm-metric__lbl">VIP по нику</div>
        </div>
        <div className="adm-metric">
          <span className="adm-metric__icon">⚡</span>
          <div className="adm-metric__val">6</div>
          <div className="adm-metric__lbl">VPN Серверов</div>
        </div>
        <div className="adm-metric">
          <span className="adm-metric__icon">🌍</span>
          <div className="adm-metric__val">VidLink #1</div>
          <div className="adm-metric__lbl">Режим под VPN</div>
        </div>
      </div>

      {/* Уведомление о действии */}
      {actionNotice && (
        <div className={`adm-toast adm-toast--${actionNotice.type}`}>
          <span>{actionNotice.msg}</span>
          <button onClick={() => setActionNotice(null)}>✕</button>
        </div>
      )}

      {/* Табы iOS Segmented Control */}
      <div className="adm-tabs">
        <button className={`adm-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          👥 Доступ по нику
        </button>
        <button className={`adm-tab ${tab === 'servers' ? 'active' : ''}`} onClick={() => setTab('servers')}>
          🎬 Серверы (VPN)
        </button>
        <button className={`adm-tab ${tab === 'broadcast' ? 'active' : ''}`} onClick={() => setTab('broadcast')}>
          📢 Объявление
        </button>
        <button className={`adm-tab ${tab === 'finances' ? 'active' : ''}`} onClick={() => setTab('finances')}>
          💳 Тарифы Stars
        </button>
        <button className={`adm-tab ${tab === 'backup' ? 'active' : ''}`} onClick={() => setTab('backup')}>
          ⚙️ Синхронизация
        </button>
      </div>

      {/* ── ВКЛАДКА 1: ВЫДАЧА РОЛЕЙ ПО НИКНЕЙМУ ── */}
      {tab === 'users' && (
        <div className="adm-tab-content">
          {/* Форма добавления */}
          <div className="adm-card">
            <div className="adm-card__header">
              <h2 className="adm-card__title">✨ Выдать VIP / Роль по @username</h2>
              <span className="adm-card__sub">Работает автономно без API и сторонних серверов</span>
            </div>

            <div className="adm-form-grid">
              <div className="adm-field">
                <label className="adm-field__label">Никнейм в Telegram</label>
                <input
                  className="adm-field__input"
                  type="text"
                  placeholder="@username (например @durov)"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                />
              </div>

              <div className="adm-field">
                <label className="adm-field__label">Назначаемая роль</label>
                <div className="adm-chips">
                  {(['vip', 'moderator', 'admin'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`adm-chip ${selectedRole === r ? 'active' : ''}`}
                      onClick={() => setSelectedRole(r)}
                    >
                      <span>{ROLE_LABELS[r].icon}</span>
                      <span>{ROLE_LABELS[r].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="adm-field">
                <label className="adm-field__label">Срок действия</label>
                <div className="adm-chips">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`adm-chip ${selectedDuration === d.id ? 'active' : ''}`}
                      onClick={() => setSelectedDuration(d.id)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="adm-field">
                <label className="adm-field__label">Заметка (необязательно)</label>
                <input
                  className="adm-field__input"
                  type="text"
                  placeholder="Например: Победитель розыгрыша, друг, оплатил переводом"
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                />
              </div>
            </div>

            <div className="adm-form-actions">
              <button className="adm-btn adm-btn--primary" onClick={handleGrant}>
                ✨ Сохранить и выдать доступ
              </button>
              <button
                className="adm-btn adm-btn--outline"
                onClick={() => {
                  if (!targetUsername.trim()) {
                    showToast('Сначала введите @username', 'error');
                    return;
                  }
                  handleCopyToken(targetUsername, selectedRole, selectedDuration);
                }}
              >
                📋 Скопировать персональную VIP-ссылку
              </button>
            </div>
          </div>

          {/* Реестр выданных прав */}
          <div className="adm-card">
            <div className="adm-card__header">
              <div className="adm-card__header-left">
                <h2 className="adm-card__title">👥 Активные пользователи в реестре ({filteredGrants.length})</h2>
                <span className="adm-card__sub">Пользователи получают доступ автоматически при входе</span>
              </div>
              <div className="adm-search-wrap">
                <input
                  className="adm-search-input"
                  type="text"
                  placeholder="Поиск по никнейму…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Фильтры ролей */}
            <div className="adm-role-filters">
              <button
                className={`adm-filter-btn ${roleFilter === 'all' ? 'active' : ''}`}
                onClick={() => setRoleFilter('all')}
              >
                Все ({grants.length})
              </button>
              <button
                className={`adm-filter-btn ${roleFilter === 'admin' ? 'active' : ''}`}
                onClick={() => setRoleFilter('admin')}
              >
                👑 Админы ({grants.filter(g => g.role === 'admin').length})
              </button>
              <button
                className={`adm-filter-btn ${roleFilter === 'moderator' ? 'active' : ''}`}
                onClick={() => setRoleFilter('moderator')}
              >
                🛡️ Модераторы ({grants.filter(g => g.role === 'moderator').length})
              </button>
              <button
                className={`adm-filter-btn ${roleFilter === 'vip' ? 'active' : ''}`}
                onClick={() => setRoleFilter('vip')}
              >
                🌟 VIP ({grants.filter(g => g.role === 'vip').length})
              </button>
            </div>

            {/* Мастер-супер-админы */}
            <div className="adm-master-badge-row">
              <span className="adm-master-tag">Мастер-список в коде:</span>
              {MASTER_ADMINS.map((ma) => (
                <span key={ma} className="adm-master-user">
                  👑 @{ma} (Владелец · Полный доступ навсегда)
                </span>
              ))}
            </div>

            {/* Список карточек пользователей */}
            <div className="adm-user-list">
              {filteredGrants.length === 0 ? (
                <div className="adm-empty">
                  <span>Ни один пользователь не найден по заданным фильтрам</span>
                </div>
              ) : (
                filteredGrants.map((g) => {
                  const isExpired = g.expiry !== null && g.expiry <= Date.now();
                  const roleMeta = ROLE_LABELS[g.role] || ROLE_LABELS.user;
                  return (
                    <div key={g.username} className={`adm-user-row ${isExpired ? 'expired' : ''}`}>
                      <div className="adm-user-avatar">
                        {g.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="adm-user-info">
                        <div className="adm-user-name-line">
                          <span className="adm-user-handle">{g.displayName}</span>
                          <span className="adm-user-role-badge" style={{ color: roleMeta.color, borderColor: `${roleMeta.color}40`, backgroundColor: `${roleMeta.color}15` }}>
                            {roleMeta.icon} {roleMeta.badge}
                          </span>
                          {isExpired && <span className="adm-user-expired-badge">Истёк</span>}
                        </div>
                        <div className="adm-user-meta">
                          <span>Срок: <strong>{g.durationLabel}</strong></span>
                          {g.expiry && (
                            <span> · До {new Date(g.expiry).toLocaleDateString('ru-RU')}</span>
                          )}
                          <span> · Выдал: {g.grantedBy}</span>
                          {g.note && <span className="adm-user-note">({g.note})</span>}
                        </div>
                      </div>

                      <div className="adm-user-actions">
                        <button
                          className="adm-icon-action"
                          onClick={() => handleExtend(g.username)}
                          title="Продлить на 30 дней"
                        >
                          +30д
                        </button>
                        <button
                          className="adm-icon-action"
                          onClick={() => handleCopyToken(g.username, g.role, '30d')}
                          title="Скопировать персональный токен"
                        >
                          🔗
                        </button>
                        <button
                          className="adm-icon-action adm-icon-action--delete"
                          onClick={() => handleRevoke(g.username)}
                          title="Отозвать права"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ВКЛАДКА 2: СЕРВЕРЫ И ПЛЕЕРЫ (ПРИОРИТЕТ ДЛЯ VPN) ── */}
      {tab === 'servers' && (
        <div className="adm-tab-content">
          <div className="adm-card">
            <div className="adm-card__header">
              <h2 className="adm-card__title">🌍 Оптимизация для пользователей с VPN</h2>
              <span className="adm-card__sub">
                В РФ Telegram открывается через VPN, поэтому американские и международные серверы выставлены на 1-е место!
              </span>
            </div>

            <div className="adm-vpn-alert">
              <span className="adm-vpn-alert__icon">⚡</span>
              <div>
                <strong>Приоритет потоков активен:</strong>
                <p>
                  1-м по умолчанию открывается <strong>VidLink Pro</strong> (4K/1080p с русской озвучкой), который идеально работает под любым VPN без сбоев. Российский Collaps смещён на резервную позицию для пользователей без VPN.
                </p>
              </div>
            </div>

            <div className="adm-servers-grid">
              <div className="adm-server-card adm-server-card--active">
                <div className="adm-server-card__top">
                  <span className="adm-server-card__flag">⚡</span>
                  <div className="adm-server-card__name">1. VidLink Pro (Основной)</div>
                  <span className="adm-server-card__status adm-server-card__status--green">Работает на ура с VPN</span>
                </div>
                <p className="adm-server-card__desc">
                  Ультраскоростной 4K/1080p плеер с русскими аудиодорожками. Стабильно отдаёт поток через европейские и американские IP-адреса VPN.
                </p>
              </div>

              <div className="adm-server-card adm-server-card--active">
                <div className="adm-server-card__top">
                  <span className="adm-server-card__flag">💎</span>
                  <div className="adm-server-card__name">2. VidSrc PM (Резерв #1)</div>
                  <span className="adm-server-card__status adm-server-card__status--green">Работает с VPN</span>
                </div>
                <p className="adm-server-card__desc">
                  Прямой скоростной CDN-поток без ограничений по регионам.
                </p>
              </div>

              <div className="adm-server-card adm-server-card--active">
                <div className="adm-server-card__top">
                  <span className="adm-server-card__flag">🚀</span>
                  <div className="adm-server-card__name">3. VidSrc SH (Резерв #2)</div>
                  <span className="adm-server-card__status adm-server-card__status--green">Работает с VPN</span>
                </div>
                <p className="adm-server-card__desc">
                  Альтернативное зеркало международного вещания.
                </p>
              </div>

              <div className="adm-server-card adm-server-card--active">
                <div className="adm-server-card__top">
                  <span className="adm-server-card__flag">🍿</span>
                  <div className="adm-server-card__name">4. 2Embed HD (Архив)</div>
                  <span className="adm-server-card__status adm-server-card__status--green">Работает с VPN</span>
                </div>
                <p className="adm-server-card__desc">
                  Мировая библиотека сериалов и фильмов с переключением серий.
                </p>
              </div>

              <div className="adm-server-card adm-server-card--active">
                <div className="adm-server-card__top">
                  <span className="adm-server-card__flag">🌐</span>
                  <div className="adm-server-card__name">5. MultiEmbed (Ротатор)</div>
                  <span className="adm-server-card__status adm-server-card__status--green">Работает с VPN</span>
                </div>
                <p className="adm-server-card__desc">
                  Автоматический балансировщик запасных стримов.
                </p>
              </div>

              <div className="adm-server-card">
                <div className="adm-server-card__top">
                  <span className="adm-server-card__flag">🇷🇺</span>
                  <div className="adm-server-card__name">6. Collaps HD (РФ)</div>
                  <span className="adm-server-card__status adm-server-card__status--amber">Только БЕЗ VPN</span>
                </div>
                <p className="adm-server-card__desc">
                  Российский CDN с озвучками LostFilm/RHS. Блокирует зарубежные IP-адреса датацентров VPN, поэтому используется только без VPN.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ВКЛАДКА 3: ОБЪЯВЛЕНИЕ ── */}
      {tab === 'broadcast' && (
        <div className="adm-tab-content">
          <div className="adm-card">
            <div className="adm-card__header">
              <h2 className="adm-card__title">📢 Глобальное объявление</h2>
              <span className="adm-card__sub">Отображается вверху главной страницы у всех пользователей</span>
            </div>

            <div className="adm-field">
              <label className="adm-field__label">Текст баннера</label>
              <textarea
                className="adm-field__textarea"
                rows={3}
                placeholder="Например: Добро пожаловать в VELORA! Обновлены серверы вещания и музыкальная волна."
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
              />
            </div>

            <div className="adm-switch-row">
              <div>
                <strong>Показывать баннер пользователям</strong>
                <p>Если выключено, баннер будет скрыт</p>
              </div>
              <input
                type="checkbox"
                className="adm-toggle"
                checked={bannerActive}
                onChange={(e) => setBannerActive(e.target.checked)}
              />
            </div>

            <button className="adm-btn adm-btn--primary" onClick={handleSaveBroadcast}>
              💾 Сохранить объявление
            </button>
          </div>
        </div>
      )}

      {/* ── ВКЛАДКА 4: ФИНАНСЫ И ТАРИФЫ STARS ── */}
      {tab === 'finances' && (
        <div className="adm-tab-content">
          <div className="adm-card">
            <div className="adm-card__header">
              <h2 className="adm-card__title">⭐ Актуальные тарифы Telegram Stars</h2>
              <span className="adm-card__sub">Новая сетка тарифов без рулетки</span>
            </div>

            <div className="adm-stars-grid">
              <div className="adm-stars-card">
                <div className="adm-stars-card__days">2 ДНЯ</div>
                <div className="adm-stars-card__price">БЕСПЛАТНО</div>
                <div className="adm-stars-card__sub">Тестовый период (1-тап активация)</div>
              </div>

              <div className="adm-stars-card">
                <div className="adm-stars-card__days">5 ДНЕЙ</div>
                <div className="adm-stars-card__price">7 ⭐ Stars</div>
                <div className="adm-stars-card__sub">Базовый доступ к HD и Lossless</div>
              </div>

              <div className="adm-stars-card adm-stars-card--popular">
                <div className="adm-stars-card__badge">ХИТ</div>
                <div className="adm-stars-card__days">7 ДНЕЙ</div>
                <div className="adm-stars-card__price">10 ⭐ Stars</div>
                <div className="adm-stars-card__sub">Полный VIP Pass + Velora AI</div>
              </div>
            </div>

            <h3 className="adm-section-subtitle">Реквизиты для альтернативной оплаты</h3>
            <div className="adm-form-grid">
              <div className="adm-field">
                <label className="adm-field__label">Номер карты (рубли)</label>
                <input
                  className="adm-field__input"
                  type="text"
                  placeholder="2200 0000 0000 0000"
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                />
              </div>

              <div className="adm-field">
                <label className="adm-field__label">Номер СБП (телефон + банк)</label>
                <input
                  className="adm-field__input"
                  type="text"
                  placeholder="+7 (900) 000-00-00 (Тинькофф/Сбер)"
                  value={sbp}
                  onChange={(e) => setSbp(e.target.value)}
                />
              </div>

              <div className="adm-field">
                <label className="adm-field__label">USDT TRC-20 кошелек</label>
                <input
                  className="adm-field__input"
                  type="text"
                  placeholder="T..."
                  value={crypto}
                  onChange={(e) => setCrypto(e.target.value)}
                />
              </div>
            </div>

            <button
              className="adm-btn adm-btn--primary"
              onClick={() => {
                showToast('Реквизиты сохранены локально!', 'success');
              }}
            >
              💾 Сохранить реквизиты
            </button>
          </div>
        </div>
      )}

      {/* ── ВКЛАДКА 5: СИНХРОНИЗАЦИЯ И ЭКСПОРТ ── */}
      {tab === 'backup' && (
        <div className="adm-tab-content">
          <div className="adm-card">
            <div className="adm-card__header">
              <h2 className="adm-card__title">⚙️ Автономность и экспорт базы</h2>
              <span className="adm-card__sub">Управляйте базой пользователей без зависимости от серверов</span>
            </div>

            <div className="adm-backup-actions">
              <div className="adm-backup-box">
                <strong>📥 Экспорт в JSON</strong>
                <p>Скопируйте текущий список выданных прав и VIP-аккаунтов для сохранения резервной копии.</p>
                <button className="adm-btn adm-btn--outline" onClick={handleExportJson}>
                  📋 Скопировать базу в JSON
                </button>
              </div>

              <div className="adm-backup-box">
                <strong>📤 Импорт из JSON</strong>
                <p>Восстановите базу пользователей на новом устройстве или после очистки кэша браузера.</p>
                <button className="adm-btn adm-btn--outline" onClick={handleImportJson}>
                  Вставить JSON базы
                </button>
              </div>
            </div>

            <div className="adm-backup-box" style={{ marginTop: '16px' }}>
              <strong>☁️ Облачная фоновая синхронизация (Serverless KV)</strong>
              <p>
                Все изменения автоматически отправляются в бесплатный распределённый KV-шлюз и загружаются клиентами за 50 мс без содержания собственных VPS!
              </p>
              <button
                className="adm-btn adm-btn--primary"
                onClick={() => {
                  syncFromCloud().then((u) => {
                    setGrants(u);
                    showToast(`Синхронизация завершена. Всего пользователей: ${u.length}`, 'success');
                  });
                }}
              >
                🔄 Синхронизировать прямо сейчас
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
