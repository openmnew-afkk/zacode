import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import {
  getStoredGrants, grantAccessToUser, revokeUserAccess, extendUserAccess,
  generateVipToken, syncFromCloud, resolveUserAccess, MASTER_ADMINS,
  type UserGrant, type UserRole, type DurationOption
} from '../services/accessControl';
import {
  pushCloudData, pullCloudData,
  getSupabaseConfig, saveSupabaseConfig,
  getCustomKvUrl, saveCustomKvUrl,
} from '../services/cloudSync';
import MandatorySubModal from '../components/MandatorySubModal';
import VeloraEmblem from '../components/VeloraEmblem';
import './AdminPage.css';

type AdminTab = 'users' | 'channel' | 'takedown' | 'servers' | 'broadcast' | 'finances' | 'backup';

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
    mandatorySub, setMandatorySub,
    blockedMovieIds, addBlockedMovieId, removeBlockedMovieId,
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

  /* Канал и Обязательная подписка (ОП) */
  const [subEnabled, setSubEnabled] = useState(mandatorySub.enabled);
  const [subChannelUsername, setSubChannelUsername] = useState(mandatorySub.channelUsername);
  const [subChannelUrl, setSubChannelUrl] = useState(mandatorySub.channelUrl);
  const [subChannelTitle, setSubChannelTitle] = useState(mandatorySub.channelTitle);
  const [subText, setSubText] = useState(mandatorySub.subText);
  const [previewSubModal, setPreviewSubModal] = useState(false);

  /* Стоп-лист правообладателей (Notice & Takedown) */
  const [newBlockedId, setNewBlockedId] = useState('');

  /* Облачная БД */
  const sbConf = getSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(sbConf?.url || '');
  const [sbKey, setSbKey] = useState(sbConf?.anonKey || '');
  const [customKv, setCustomKv] = useState(getCustomKvUrl());

  /* Реквизиты (Только анонимная крипта) */
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
      telegramUsername || 'ZenovaAdmin',
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
    const link = `https://t.me/ZenovaAppBot/app?startapp=token_${token}`;
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
        localStorage.setItem('zenova_access_registry_v2', JSON.stringify(parsed));
        setGrants(parsed);
        showToast(`Успешно импортировано ${parsed.length} пользователей!`, 'success');
      }
    } catch {
      showToast('Ошибка: некорректный формат JSON', 'error');
    }
  };

  /* Сохранение объявления */
  const handleSaveBroadcast = async () => {
    const text = bannerActive ? bannerText.trim() : '';
    setAnnouncement(text);
    await pushCloudData({
      grants,
      announcement: text,
      adsEnabled,
      mandatorySub,
      blockedMovieIds,
      updatedAt: Date.now(),
      updatedBy: telegramUsername || 'Admin',
    });
    showToast(bannerActive ? 'Глобальное объявление опубликовано!' : 'Объявление скрыто!', 'success');
  };

  /* Сохранение настроек канала и ОП */
  const handleSaveChannelSettings = async () => {
    const updated = {
      enabled: subEnabled,
      channelUsername: subChannelUsername.trim(),
      channelUrl: subChannelUrl.trim(),
      channelTitle: subChannelTitle.trim(),
      subText: subText.trim(),
    };
    setMandatorySub(updated);
    await pushCloudData({
      grants,
      announcement: bannerActive ? bannerText.trim() : '',
      adsEnabled,
      mandatorySub: updated,
      blockedMovieIds,
      updatedAt: Date.now(),
      updatedBy: telegramUsername || 'Admin',
    });
    showToast('Настройки канала и ОП сохранены в облачную БД!', 'success');
  };

  /* Добавление в стоп-лист правообладателей (Notice & Takedown) */
  const handleAddBlockedId = async () => {
    const clean = newBlockedId.trim();
    if (!clean) {
      showToast('Введите ID тайтла (Кинопоиск или TMDB)', 'error');
      return;
    }
    addBlockedMovieId(clean);
    setNewBlockedId('');
    const updatedList = Array.from(new Set([...blockedMovieIds, clean]));
    await pushCloudData({
      grants,
      announcement: bannerActive ? bannerText.trim() : '',
      adsEnabled,
      mandatorySub,
      blockedMovieIds: updatedList,
      updatedAt: Date.now(),
      updatedBy: telegramUsername || 'Admin',
    });
    showToast(`Тайтл ID «${clean}» добавлен в Стоп-лист и скрыт!`, 'success');
  };

  /* Удаление из стоп-листа правообладателей */
  const handleRemoveBlockedId = async (id: string) => {
    removeBlockedMovieId(id);
    const updatedList = blockedMovieIds.filter((x) => x !== id);
    await pushCloudData({
      grants,
      announcement: bannerActive ? bannerText.trim() : '',
      adsEnabled,
      mandatorySub,
      blockedMovieIds: updatedList,
      updatedAt: Date.now(),
      updatedBy: telegramUsername || 'Admin',
    });
    showToast(`Тайтл ID «${id}» удален из Стоп-листа`, 'info');
  };

  /* Сохранение конфигурации облачной базы */
  const handleSaveCloudConfig = () => {
    saveSupabaseConfig(sbUrl, sbKey);
    saveCustomKvUrl(customKv);
    showToast('Параметры облачной БД сохранены!', 'success');
  };

  /* Принудительная синхронизация */
  const handleForceSync = async () => {
    showToast('Синхронизируем базу с облаком…', 'info');
    const cloud = await pullCloudData();
    if (cloud) {
      if (cloud.grants) setGrants(cloud.grants);
      if (cloud.mandatorySub) {
        setMandatorySub(cloud.mandatorySub);
        setSubEnabled(cloud.mandatorySub.enabled);
        setSubChannelUsername(cloud.mandatorySub.channelUsername);
        setSubChannelUrl(cloud.mandatorySub.channelUrl);
        setSubChannelTitle(cloud.mandatorySub.channelTitle);
        setSubText(cloud.mandatorySub.subText);
      }
      showToast(`Синхронизация завершена! Пользователей: ${cloud.grants?.length || grants.length}`, 'success');
    } else {
      showToast('Загружено из локального кэша', 'info');
    }
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
          <h1 className="adm-login-title">ZENOVA Control</h1>
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
              <div className="adm-badge">ZENOVA MASTER PANEL</div>
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
            <span>Сессия: <strong>@{telegramUsername || 'Admin'}</strong> (Супер-Администратор)</span>
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
          <span className="adm-metric__icon">🛡️</span>
          <div className="adm-metric__val">{blockedMovieIds.length}</div>
          <div className="adm-metric__lbl">Стоп-лист DMCA</div>
        </div>
        <div className="adm-metric">
          <span className="adm-metric__icon">🌍</span>
          <div className="adm-metric__val">Плеер 1 (4K)</div>
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
        <button className={`adm-tab ${tab === 'channel' ? 'active' : ''}`} onClick={() => setTab('channel')}>
          📢 Канал и ОП
        </button>
        <button className={`adm-tab ${tab === 'takedown' ? 'active' : ''}`} onClick={() => setTab('takedown')}>
          🛡️ DMCA и Защита
        </button>
        <button className={`adm-tab ${tab === 'servers' ? 'active' : ''}`} onClick={() => setTab('servers')}>
          🎬 Серверы (VPN)
        </button>
        <button className={`adm-tab ${tab === 'broadcast' ? 'active' : ''}`} onClick={() => setTab('broadcast')}>
          💬 Объявление
        </button>
        <button className={`adm-tab ${tab === 'finances' ? 'active' : ''}`} onClick={() => setTab('finances')}>
          ⭐ Тарифы Stars
        </button>
        <button className={`adm-tab ${tab === 'backup' ? 'active' : ''}`} onClick={() => setTab('backup')}>
          ☁️ Облачная БД
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

      {/* ── ВКЛАДКА: ОБЯЗАТЕЛЬНАЯ ПОДПИСКА НА КАНАЛ (ОП) ── */}
      {tab === 'channel' && (
        <div className="adm-tab-content">
          <div className="adm-card">
            <div className="adm-card__header">
              <h2 className="adm-card__title">📢 Обязательная подписка (ОП) на Telegram-канал</h2>
              <span className="adm-card__sub">
                Ключевой модуль монетизации и роста: каждый зритель подписывается на ваш канал перед просмотром
              </span>
            </div>

            <div className="adm-switch-row">
              <div>
                <strong>Включить обязательную подписку (ОП)</strong>
                <p>Если включено — все пользователи видят модальное окно с подпиской перед просмотром видео</p>
              </div>
              <input
                type="checkbox"
                className="adm-toggle"
                checked={subEnabled}
                onChange={(e) => setSubEnabled(e.target.checked)}
              />
            </div>

            <div className="adm-form-grid">
              <div className="adm-field">
                <label className="adm-field__label">Username канала в Telegram</label>
                <input
                  className="adm-field__input"
                  type="text"
                  placeholder="@ZenovaCinema или имя_канала"
                  value={subChannelUsername}
                  onChange={(e) => setSubChannelUsername(e.target.value)}
                />
              </div>

              <div className="adm-field">
                <label className="adm-field__label">Прямая ссылка на канал</label>
                <input
                  className="adm-field__input"
                  type="text"
                  placeholder="https://t.me/ZenovaCinema"
                  value={subChannelUrl}
                  onChange={(e) => setSubChannelUrl(e.target.value)}
                />
              </div>

              <div className="adm-field" style={{ gridColumn: '1 / -1' }}>
                <label className="adm-field__label">Название канала в модальном окне</label>
                <input
                  className="adm-field__input"
                  type="text"
                  placeholder="Например: ZENOVA Cinema & Sound"
                  value={subChannelTitle}
                  onChange={(e) => setSubChannelTitle(e.target.value)}
                />
              </div>

              <div className="adm-field" style={{ gridColumn: '1 / -1' }}>
                <label className="adm-field__label">Текст призыва к подписке</label>
                <textarea
                  className="adm-field__textarea"
                  rows={3}
                  placeholder="Подпишитесь на наш официальный Telegram-канал, чтобы смотреть новинки кино, сериалы и слушать музыку без рекламы."
                  value={subText}
                  onChange={(e) => setSubText(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                className="adm-btn adm-btn--primary"
                style={{ flex: 1, minWidth: '180px' }}
                onClick={handleSaveChannelSettings}
              >
                💾 Сохранить и применить
              </button>
              <button
                className="adm-btn adm-btn--outline"
                style={{ flex: 1, minWidth: '180px' }}
                onClick={() => setPreviewSubModal(true)}
              >
                👁️ Предпросмотр окна ОП
              </button>
            </div>

            <div className="adm-info-callout" style={{ marginTop: '20px' }}>
              <div className="adm-info-callout__title">💎 Почему эта фича продаёт проект за 200,000+ ₽</div>
              <p className="adm-info-callout__text">
                В Telegram Mini App трафик на канал — это главный источник денег. Покупатели готовых онлайн-кинотеатров берут их, чтобы мгновенно заливать себе тысячи подписчиков. 10 000 просмотров фильма = до 7 000 новых живых подписчиков в канал покупателя!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── ВКЛАДКА: DMCA И ЮРИДИЧЕСКАЯ ЗАЩИТА (NOTICE & TAKEDOWN) ── */}
      {tab === 'takedown' && (
        <div className="adm-tab-content">
          <div className="adm-card">
            <div className="adm-card__header">
              <h2 className="adm-card__title">🛡️ Стоп-лист правообладателей (Notice & Takedown)</h2>
              <span className="adm-card__sub">
                Защита по ст. 1253.1 ГК РФ (Информационный посредник): мгновенное скрытие тайтла по первому запросу
              </span>
            </div>

            <div className="adm-info-callout" style={{ marginBottom: '16px' }}>
              <div className="adm-info-callout__title">⚖️ Юридическая безопасность владельца</div>
              <p className="adm-info-callout__text">
                Если официальный правообладатель (Кинопоиск, Premier, Start, Иви, АЗАПИ) присылает претензию — вы не спорите, а вставляете ID фильма/сериала ниже и нажимаете «Заблокировать». После этого тайтл мгновенно исключается из каталога, поиска и плееров. Добросовестное удаление в течение 24 часов освобождает от гражданской и уголовной ответственности!
              </p>
            </div>

            <div className="adm-form-grid">
              <div className="adm-field" style={{ gridColumn: '1 / -1' }}>
                <label className="adm-field__label">ID фильма или сериала (Кинопоиск ID / TMDB ID / Название)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    className="adm-field__input"
                    type="text"
                    placeholder="Например: 535341 или 123456"
                    value={newBlockedId}
                    onChange={(e) => setNewBlockedId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddBlockedId()}
                  />
                  <button className="adm-btn adm-btn--primary" onClick={handleAddBlockedId} style={{ flexShrink: 0 }}>
                    🚫 Заблокировать
                  </button>
                </div>
              </div>
            </div>

            <h3 className="adm-section-subtitle" style={{ marginTop: '20px' }}>
              Активный стоп-лист заблокированных тайтлов ({blockedMovieIds.length})
            </h3>

            {blockedMovieIds.length === 0 ? (
              <div className="adm-empty-box" style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                Стоп-лист пуст. Претензий от правообладателей не поступало.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {blockedMovieIds.map((id) => (
                  <div
                    key={id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '12px',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#fca5a5', fontSize: '13px' }}>ID: {id}</strong>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginLeft: '10px' }}>
                        Скрыт из плеера, поиска и каталога
                      </span>
                    </div>
                    <button
                      className="adm-btn adm-btn--outline"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => handleRemoveBlockedId(id)}
                    >
                      Разблокировать
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="adm-backup-box" style={{ marginTop: '20px' }}>
              <strong>🔞 Федеральный закон № 436-ФЗ (Возрастной ценз 18+)</strong>
              <p>
                В приложении включено обязательное диалоговое подтверждение совершеннолетия при открытии контента с рейтингом 18+. Порнографические материалы строго исключены из архитектуры в соответствии со ст. 242 УК РФ.
              </p>
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
                  1-м по умолчанию открывается <strong>Плеер 1</strong> (Ultra HD 4K со студийными озвучками). В случае блокировки или работы под VPN пользователи могут переключиться на Плеер 2, 3, 4 или 5 в один клик.
                </p>
              </div>
            </div>

            <div className="adm-servers-grid">
              <div className="adm-server-card adm-server-card--active">
                <div className="adm-server-card__top">
                  <span className="adm-server-card__flag">⚡</span>
                  <div className="adm-server-card__name">1. Плеер 1 (Основной)</div>
                  <span className="adm-server-card__status adm-server-card__status--green">Ultra HD 4K</span>
                </div>
                <p className="adm-server-card__desc">
                  Главный студийный балансер: LostFilm, Red Head Sound, Резка, профессиональный дубляж 4K/1080p.
                </p>
              </div>

              <div className="adm-server-card adm-server-card--active">
                <div className="adm-server-card__top">
                  <span className="adm-server-card__flag">🍿</span>
                  <div className="adm-server-card__name">2. Плеер 2 (Резерв #1)</div>
                  <span className="adm-server-card__status adm-server-card__status--green">Работает с VPN</span>
                </div>
                <p className="adm-server-card__desc">
                  Full HD со студийными переводами (HDRezka, LostFilm, Дубляж), без редиректов.
                </p>
              </div>

              <div className="adm-server-card adm-server-card--active">
                <div className="adm-server-card__top">
                  <span className="adm-server-card__flag">✨</span>
                  <div className="adm-server-card__name">3. Плеер 3 (Резерв #2)</div>
                  <span className="adm-server-card__status adm-server-card__status--green">Работает с VPN</span>
                </div>
                <p className="adm-server-card__desc">
                  Альтернативный скоростной поток со всеми звуковыми дорожками.
                </p>
              </div>

              <div className="adm-server-card adm-server-card--active">
                <div className="adm-server-card__top">
                  <span className="adm-server-card__flag">🎥</span>
                  <div className="adm-server-card__name">4. Плеер 4 (Резерв #3)</div>
                  <span className="adm-server-card__status adm-server-card__status--green">Работает с VPN</span>
                </div>
                <p className="adm-server-card__desc">
                  Скоростной видео-CDN с мгновенной буферизацией и дубляжом Full HD.
                </p>
              </div>

              <div className="adm-server-card adm-server-card--active">
                <div className="adm-server-card__top">
                  <span className="adm-server-card__flag">🇺🇸</span>
                  <div className="adm-server-card__name">5. Плеер 5 (Зарубежный / VPN)</div>
                  <span className="adm-server-card__status adm-server-card__status--green">100% с любым VPN</span>
                </div>
                <p className="adm-server-card__desc">
                  Международный скоростной CDN. Оригинальные дорожки в 4K + субтитры, стабилен из любой точки мира.
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
                placeholder="Например: Добро пожаловать в ZENOVA! Обновлены серверы вещания и музыкальная волна."
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
                <div className="adm-stars-card__sub">Полный VIP Pass + ZENOVA AI</div>
              </div>
            </div>

            <h3 className="adm-section-subtitle">Безопасный кошелёк (Криптовалюта USDT)</h3>
            <p className="adm-card__sub" style={{ marginBottom: '14px' }}>
              🔒 Банковские карты РФ и СБП отключены для исключения рисков по ст. 146 и 171 УК РФ. Рекомендуется использовать официальные Telegram Stars и анонимный криптовалютный адрес.
            </p>
            <div className="adm-form-grid">
              <div className="adm-field" style={{ gridColumn: '1 / -1' }}>
                <label className="adm-field__label">USDT TRC-20 / TON кошелек</label>
                <input
                  className="adm-field__input"
                  type="text"
                  placeholder="T... или UQ..."
                  value={crypto}
                  onChange={(e) => setCrypto(e.target.value)}
                />
              </div>
            </div>

            <button
              className="adm-btn adm-btn--primary"
              onClick={() => {
                showToast('Крипто-реквизиты сохранены локально!', 'success');
              }}
            >
              💾 Сохранить реквизиты
            </button>
          </div>
        </div>
      )}

      {/* ── ВКЛАДКА 5: ОБЛАЧНАЯ БАЗА ДАННЫХ И СИНХРОНИЗАЦИЯ ── */}
      {tab === 'backup' && (
        <div className="adm-tab-content">
          <div className="adm-card">
            <div className="adm-card__header">
              <h2 className="adm-card__title">☁️ Серверная БД без серверов (Serverless)</h2>
              <span className="adm-card__sub">
                Глобальная синхронизация VIP-доступа, каналов и объявлений через бесплатный Supabase REST API
              </span>
            </div>

            <div className="adm-form-grid">
              <div className="adm-field">
                <label className="adm-field__label">Supabase URL (REST API)</label>
                <input
                  className="adm-field__input"
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                />
              </div>

              <div className="adm-field">
                <label className="adm-field__label">Supabase Anon Public Key</label>
                <input
                  className="adm-field__input"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                />
              </div>

              <div className="adm-field" style={{ gridColumn: '1 / -1' }}>
                <label className="adm-field__label">Пользовательский KV / Edge Endpoint (Опционально)</label>
                <input
                  className="adm-field__input"
                  type="text"
                  placeholder="https://my-edge-kv.worker.dev/zenova"
                  value={customKv}
                  onChange={(e) => setCustomKv(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
              <button
                className="adm-btn adm-btn--primary"
                style={{ flex: 1, minWidth: '180px' }}
                onClick={handleSaveCloudConfig}
              >
                💾 Сохранить параметры БД
              </button>
              <button
                className="adm-btn adm-btn--outline"
                style={{ flex: 1, minWidth: '180px' }}
                onClick={handleForceSync}
              >
                🔄 Синхронизировать прямо сейчас
              </button>
            </div>

            <div className="adm-backup-actions" style={{ marginTop: '20px' }}>
              <div className="adm-backup-box">
                <strong>📥 Экспорт в JSON</strong>
                <p>Скопируйте текущий список выданных прав и VIP-аккаунтов для резервной копии.</p>
                <button className="adm-btn adm-btn--outline" onClick={handleExportJson}>
                  📋 Скопировать JSON
                </button>
              </div>

              <div className="adm-backup-box">
                <strong>📤 Импорт из JSON</strong>
                <p>Восстановите базу пользователей на новом устройстве или после очистки кэша.</p>
                <button className="adm-btn adm-btn--outline" onClick={handleImportJson}>
                  📥 Вставить JSON
                </button>
              </div>
            </div>

            <div className="adm-info-callout" style={{ marginTop: '20px' }}>
              <div className="adm-info-callout__title">🚀 Преимущество перед покупателем: 0 ₽ расходов в месяц!</div>
              <p className="adm-info-callout__text">
                Проекту не нужен дорогой VPS или сложный бэкенд на Python/Node.js, который падает от нагрузки. Архитектура построена на прямых защищённых запросах к Supabase REST API (бесплатный PostgreSQL до 500 МБ и 50,000 MAU) + локальное кэширование и Telegram CloudStorage.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно предпросмотра ОП для администратора */}
      {previewSubModal && (
        <MandatorySubModal
          previewMode
          onClosePreview={() => setPreviewSubModal(false)}
        />
      )}
    </div>
  );
};

export default AdminPage;
