import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { getRuProxy, setRuProxy, testRuProxy } from '../api/players';
import {
  getApiBase, setApiBase, adminGetConfig, adminGrantPremium, adminRevokePremium,
  adminAddModerator, adminRemoveModerator, adminApprovePayment, adminRemovePayment,
  adminSaveConfig, modGrantPremium, modSaveConfig, moderatorLogin,
  type AdminConfig, type PremiumGrant,
} from '../api/backend';
import './AdminPage.css';

const ADMIN_TOKEN_KEY = 'tc_admin_token';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    isAdmin, adminLogin, adminLogout, adsEnabled, setAdsEnabled,
    announcement, setAnnouncement, isPremium, role, setRole,
    telegramUsername, requisites, prices, moderators,
    applyBackendConfig, applyRemotePremium,
  } = useStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  const isModerator = role === 'moderator';
  const isFullAdmin = isAdmin; // админ = полный доступ, модератор = ограниченный

  /* ── RU-Proxy (обход гео-блока русских плееров при VPN) ── */
  const [proxyUrl, setProxyUrl] = useState<string>(() => getRuProxy());
  const [proxyStatus, setProxyStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [proxyTesting, setProxyTesting] = useState(false);
  const [proxySaved, setProxySaved] = useState(false);

  /* ── API-сервер (центральная админка) ── */
  const [apiUrl, setApiUrl] = useState<string>(() => getApiBase());
  const [apiMsg, setApiMsg] = useState('');

  /* ── Центральный конфиг (платежи, гранты) ── */
  const [serverCfg, setServerCfg] = useState<AdminConfig | null>(null);

  /* ── Премиум по нику ── */
  const [grantName, setGrantName] = useState('');
  const [grantDays, setGrantDays] = useState(30);
  const [grantForever, setGrantForever] = useState(false);
  const [grantMsg, setGrantMsg] = useState('');

  /* ── Модераторы ── */
  const [modName, setModName] = useState('');
  const [modMsg, setModMsg] = useState('');

  /* ── Реквизиты ── */
  const [card, setCard] = useState(requisites.card);
  const [sbp, setSbp] = useState(requisites.sbp);
  const [crypto, setCrypto] = useState(requisites.crypto);
  const [reqNote, setReqNote] = useState(requisites.note);
  const [reqMsg, setReqMsg] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);

  /* ── Загрузка центрального конфига после входа ── */
  useEffect(() => {
    if (!isAdmin || !getApiBase()) return;
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    adminGetConfig(token).then((cfg) => {
      if (!cfg) return;
      setServerCfg(cfg);
      setAutoApprove(cfg.autoApprove);
      setCard(cfg.requisites?.card || '');
      setSbp(cfg.requisites?.sbp || '');
      setCrypto(cfg.requisites?.crypto || '');
      setReqNote(cfg.requisites?.note || '');
    });
  }, [isAdmin]);

  const handleProxySave = () => {
    setRuProxy(proxyUrl);
    setProxyUrl(getRuProxy()); // нормализованный адрес
    setProxySaved(true);
    setTimeout(() => setProxySaved(false), 2000);
  };

  const handleProxyTest = async () => {
    setProxyTesting(true);
    setProxyStatus(null);
    const result = await testRuProxy(proxyUrl);
    setProxyStatus(result);
    setProxyTesting(false);
  };

  const handleProxyClear = () => {
    setRuProxy('');
    setProxyUrl('');
    setProxyStatus(null);
  };

  const handleApiSave = () => {
    setApiBase(apiUrl);
    setApiUrl(getApiBase());
    setApiMsg('✅ Адрес сохранён. Конфиг подтянется при следующем запуске приложения.');
    setTimeout(() => setApiMsg(''), 4000);
  };

  const handleLogin = async () => {
    if (locked) return;
    if (attempts >= 5) {
      setLocked(true);
      setError('🔒 Слишком много попыток. Подождите 60 секунд.');
      setTimeout(() => { setLocked(false); setAttempts(0); setError(''); }, 60000);
      return;
    }

    setLoading(true);
    setError('');

    // Искусственная задержка для защиты от brute force
    await new Promise(r => setTimeout(r, 800));

    const ok = await adminLogin(password);
    setLoading(false);

    if (ok) {
      // Токен админа для серверного API (тот же пароль)
      try { localStorage.setItem(ADMIN_TOKEN_KEY, password); } catch {}
      setPassword('');
      setError('');
      return;
    }

    /* Не админский пароль — пробуем вход модератора (по имени в списке) */
    if (getApiBase()) {
      const modRes = await moderatorLogin(password);
      if (modRes.ok) {
        setRole('moderator');
        setPassword('');
        setError('');
        setLoading(false);
        return;
      }
    }

    setAttempts(a => a + 1);
    setError(`❌ Неверный пароль (${attempts + 1}/5)`);
  };

  /* ── Действия админ/модератора ── */
  const handleGrantPremium = async () => {
    if (!grantName.trim()) return;
    setGrantMsg('⏳ Отправляю…');
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    const res = isFullAdmin
      ? await adminGrantPremium(token, grantName, grantDays, grantForever)
      : await modGrantPremium(grantName, grantDays);
    setGrantMsg(res.message || (res.ok ? '✅ Готово' : '❌ Ошибка'));
    if (res.ok) {
      setGrantName('');
      // Обновляем список грантов
      if (isFullAdmin) {
        adminGetConfig(token).then((cfg) => { if (cfg) setServerCfg(cfg); });
      }
    }
  };

  const handleRevokePremium = async (name: string) => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    const res = await adminRevokePremium(token, name);
    setGrantMsg(res.message || '');
    adminGetConfig(token).then((cfg) => { if (cfg) setServerCfg(cfg); });
  };

  const handleAddModerator = async () => {
    if (!modName.trim()) return;
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    const res = await adminAddModerator(token, modName);
    setModMsg(res.message || '');
    if (res.ok) {
      setModName('');
      adminGetConfig(token).then((cfg) => { if (cfg) setServerCfg(cfg); });
    }
  };

  const handleRemoveModerator = async (name: string) => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    const res = await adminRemoveModerator(token, name);
    setModMsg(res.message || '');
    adminGetConfig(token).then((cfg) => { if (cfg) setServerCfg(cfg); });
  };

  const handleSaveRequisites = async () => {
    const fields = {
      requisites: { card, sbp, crypto, note: reqNote },
      autoApprove,
    };
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    const res = isFullAdmin
      ? await adminSaveConfig(token, fields)
      : await modSaveConfig(telegramUsername, fields);
    setReqMsg(res.message || (res.ok ? '✅ Сохранено' : '❌ Ошибка'));
    setTimeout(() => setReqMsg(''), 3000);
  };

  const handleApprovePayment = async (index: number) => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    const res = await adminApprovePayment(token, index);
    setServerCfg((prev) => prev ? { ...prev } : prev);
    adminGetConfig(token).then((cfg) => { if (cfg) setServerCfg(cfg); });
  };

  const handleRemovePayment = async (index: number) => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    await adminRemovePayment(token, index);
    adminGetConfig(token).then((cfg) => { if (cfg) setServerCfg(cfg); });
  };

  const handleServerAds = async (val: boolean) => {
    setAdsEnabled(val); // локально сразу
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    if (isFullAdmin) await adminSaveConfig(token, { adsEnabled: val });
    else await modSaveConfig(telegramUsername, { adsEnabled: val });
  };

  const handleServerAnnouncement = async (text: string) => {
    setAnnouncement(text); // локально сразу
    const token = localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    if (isFullAdmin) await adminSaveConfig(token, { announcement: text });
    else await modSaveConfig(telegramUsername, { announcement: text });
  };

  const handleLogout = () => {
    adminLogout();
    try { localStorage.removeItem(ADMIN_TOKEN_KEY); } catch {}
  };

  if (!isAdmin && !isModerator) {
    return (
      <div className="admin">
        <button className="admin__back" onClick={() => navigate(-1)}>← Назад</button>
        <div className="admin__login">
          <div className="admin__lock">🔐</div>
          <h1 className="admin__title">Админ панель</h1>
          <p className="admin__desc">Пароль администратора или имя модератора</p>
          <input
            className="admin__input"
            type="password"
            placeholder="Пароль / никнейм"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            disabled={locked}
            autoComplete="off"
          />
          {error && <p className="admin__error">{error}</p>}
          <button
            className="admin__btn"
            onClick={handleLogin}
            disabled={loading || locked || !password}
          >
            {loading ? '⏳ Проверка…' : '🔓 Войти'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <header className="admin__header">
        <button className="admin__back" onClick={() => navigate(-1)}>← Назад</button>
        <h1 className="admin__title">
          {isFullAdmin ? '⚙️ Админ панель' : '🛡 Панель модератора'}
        </h1>
        <button className="admin__logout" onClick={handleLogout}>Выйти</button>
      </header>

      <div className="admin__content">
        {/* Статус */}
        <section className="admin__section">
          <h2 className="admin__section-title">📊 Статус</h2>
          <div className="admin__stats">
            <div className="admin__stat">
              <span className="admin__stat-label">Премиум</span>
              <span className="admin__stat-value">{isPremium ? '✅ Активен' : '❌ Нет'}</span>
            </div>
            <div className="admin__stat">
              <span className="admin__stat-label">Реклама</span>
              <span className="admin__stat-value">{adsEnabled ? '📺 Вкл' : '🚫 Выкл'}</span>
            </div>
          </div>
        </section>

        {/* RU-Proxy — обход гео-блока русских плееров */}
        <section className="admin__section">
          <h2 className="admin__section-title">🌍 RU-Proxy · Русские озвучки с VPN</h2>
          <p className="admin__hint">
            Прокси на российском VPS (<code>proxy/server.js</code>). Пользователи
            с зарубежным IP (VPN) смогут смотреть Kodik / Collaps / VideoCDN.
            Пусто = русские плееры только для РФ/СНГ.
          </p>
          <input
            className="admin__proxy-input"
            type="url"
            placeholder="https://ru-proxy.example.com"
            value={proxyUrl}
            onChange={e => { setProxyUrl(e.target.value); setProxyStatus(null); }}
            spellCheck={false}
            autoComplete="off"
          />
          <div className="admin__actions">
            <button className="admin__action-btn" onClick={handleProxySave} disabled={proxySaved}>
              {proxySaved ? '✅ Сохранено' : '💾 Сохранить'}
            </button>
            <button className="admin__action-btn" onClick={handleProxyTest} disabled={proxyTesting || !proxyUrl.trim()}>
              {proxyTesting ? '⏳ Проверяю…' : '🔍 Проверить'}
            </button>
            {proxyUrl && (
              <button className="admin__action-btn admin__action-btn--danger" onClick={handleProxyClear}>
                🗑️ Сбросить
              </button>
            )}
          </div>
          {proxyStatus && (
            <p className={`admin__proxy-status ${proxyStatus.ok ? 'ok' : 'fail'}`}>
              {proxyStatus.message}
            </p>
          )}
          {!proxyStatus && getRuProxy() && (
            <p className="admin__proxy-status ok">🟢 Активен: {getRuProxy()}</p>
          )}
        </section>

        {/* API-сервер — центральное управление (админ) */}
        {isFullAdmin && (
          <section className="admin__section">
            <h2 className="admin__section-title">🖥️ API-сервер · Центральное управление</h2>
            <p className="admin__hint">
              Адрес мини-бэкенда (<code>proxy/server.js</code> на том же VPS, что и RU-Proxy).
              Через него работают: выдача премиума по нику, модераторы, реквизиты и
              авто-активация премиума после оплаты — на <b>всех</b> устройствах.
              Обычно совпадает с RU-Proxy (это один сервер).
            </p>
            <input
              className="admin__proxy-input"
              type="url"
              placeholder="https://ru-proxy.example.com"
              value={apiUrl}
              onChange={e => { setApiUrl(e.target.value); setApiMsg(''); }}
              spellCheck={false}
              autoComplete="off"
            />
            <div className="admin__actions">
              <button className="admin__action-btn" onClick={handleApiSave}>
                💾 Сохранить
              </button>
            </div>
            {apiMsg && <p className="admin__proxy-status ok">{apiMsg}</p>}
            {!apiMsg && getApiBase() && (
              <p className="admin__proxy-status ok">🟢 Подключено: {getApiBase()}</p>
            )}
            {!apiMsg && !getApiBase() && (
              <p className="admin__proxy-status fail">
                ⚠️ Не настроен — премиум по нику и оплата работают только локально
              </p>
            )}
          </section>
        )}

        {/* 👑 Премиум по нику */}
        <section className="admin__section">
          <h2 className="admin__section-title">👑 Премиум по имени/нику</h2>
          <p className="admin__hint">
            Введите Telegram username (@nick) или имя — премиум активируется на сервере
            и заработает у пользователя при следующем входе в приложение.
            {isModerator && ' Модератор может выдавать максимум 30 дней.'}
          </p>
          <input
            className="admin__proxy-input"
            type="text"
            placeholder="@username или Имя"
            value={grantName}
            onChange={e => setGrantName(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          {isFullAdmin && (
            <div className="admin__row">
              <select
                className="admin__select"
                value={grantForever ? 'forever' : String(grantDays)}
                onChange={e => {
                  if (e.target.value === 'forever') { setGrantForever(true); }
                  else { setGrantForever(false); setGrantDays(Number(e.target.value)); }
                }}
              >
                <option value="7">7 дней</option>
                <option value="30">30 дней</option>
                <option value="90">90 дней</option>
                <option value="365">1 год</option>
                <option value="forever">♾️ Бессрочно</option>
              </select>
            </div>
          )}
          <div className="admin__actions">
            <button className="admin__action-btn" onClick={handleGrantPremium} disabled={!grantName.trim()}>
              👑 Выдать
            </button>
          </div>
          {grantMsg && <p className="admin__proxy-status">{grantMsg}</p>}

          {/* Список действующих грантов */}
          {isFullAdmin && serverCfg?.premiumGrants && serverCfg.premiumGrants.length > 0 && (
            <div className="admin__list">
              {serverCfg.premiumGrants.map((g: PremiumGrant) => (
                <div key={g.username} className="admin__list-item">
                  <div className="admin__list-info">
                    <span className="admin__list-name">@{g.username}</span>
                    <span className="admin__list-sub">
                      {g.forever ? '♾️ Бессрочно' : g.expiry ? `до ${new Date(g.expiry).toLocaleDateString('ru-RU')}` : ''} · от {g.by}
                    </span>
                  </div>
                  <button className="admin__list-remove" onClick={() => handleRevokePremium(g.username)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 🛡 Модераторы (только админ) */}
        {isFullAdmin && (
          <section className="admin__section">
            <h2 className="admin__section-title">🛡 Модераторы</h2>
            <p className="admin__hint">
              Модератор входит в панель, введя своё имя вместо пароля. Может: менять
              объявление, переключать рекламу, выдавать премиум до 30 дней.
            </p>
            <input
              className="admin__proxy-input"
              type="text"
              placeholder="@username или Имя модератора"
              value={modName}
              onChange={e => setModName(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <div className="admin__actions">
              <button className="admin__action-btn" onClick={handleAddModerator} disabled={!modName.trim()}>
                ➕ Добавить
              </button>
            </div>
            {modMsg && <p className="admin__proxy-status">{modMsg}</p>}
            {serverCfg?.moderators && serverCfg.moderators.length > 0 && (
              <div className="admin__list">
                {serverCfg.moderators.map((m: string) => (
                  <div key={m} className="admin__list-item">
                    <div className="admin__list-info">
                      <span className="admin__list-name">🛡 {m}</span>
                    </div>
                    <button className="admin__list-remove" onClick={() => handleRemoveModerator(m)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Реклама */}
        <section className="admin__section">
          <h2 className="admin__section-title">📺 Реклама</h2>
          <label className="admin__toggle">
            <span>Показывать рекламу {getApiBase() ? '(на всех устройствах)' : ''}</span>
            <input type="checkbox" checked={adsEnabled} onChange={e => handleServerAds(e.target.checked)} />
            <span className="admin__toggle-slider" />
          </label>
        </section>

        {/* Объявление */}
        <section className="admin__section">
          <h2 className="admin__section-title">📢 Объявление</h2>
          <p className="admin__hint">{getApiBase() ? 'Публикуется на всех устройствах' : 'Локально (API-сервер не настроен)'}</p>
          <textarea
            className="admin__textarea"
            placeholder="Текст объявления (пустое = скрыто)"
            value={announcement}
            onChange={e => setAnnouncement(e.target.value)}
            onBlur={() => handleServerAnnouncement(announcement)}
            rows={3}
          />
        </section>

        {/* 💳 Реквизиты оплаты + авто-выдача (админ) */}
        {isFullAdmin && (
          <section className="admin__section">
            <h2 className="admin__section-title">💳 Реквизиты оплаты премиума</h2>
            <p className="admin__hint">
              Пользователь увидит их на странице Премиума. После оплаты он нажимает
              «Я оплатил» — и премиум активируется автоматически.
            </p>
            <input className="admin__proxy-input" type="text" placeholder="💳 Номер карты" value={card} onChange={e => setCard(e.target.value)} />
            <input className="admin__proxy-input" type="text" placeholder="🏦 СБП (телефон/банк)" value={sbp} onChange={e => setSbp(e.target.value)} />
            <input className="admin__proxy-input" type="text" placeholder="🪙 Крипта (USDT TRC-20 и т.п.)" value={crypto} onChange={e => setCrypto(e.target.value)} />
            <textarea className="admin__textarea" placeholder="Примечание (имя получателя, комментарий)" rows={2} value={reqNote} onChange={e => setReqNote(e.target.value)} />
            <label className="admin__toggle" style={{ marginTop: 12 }}>
              <span>⚡ Авто-выдача премиума после оплаты</span>
              <input type="checkbox" checked={autoApprove} onChange={e => setAutoApprove(e.target.checked)} />
              <span className="admin__toggle-slider" />
            </label>
            <div className="admin__actions" style={{ marginTop: 12 }}>
              <button className="admin__action-btn" onClick={handleSaveRequisites}>
                💾 Сохранить реквизиты
              </button>
            </div>
            {reqMsg && <p className="admin__proxy-status">{reqMsg}</p>}
          </section>
        )}

        {/* 💰 Платежи (админ) */}
        {isFullAdmin && serverCfg?.payments && (
          <section className="admin__section">
            <h2 className="admin__section-title">💰 Платежи и заявки</h2>
            {serverCfg.payments.length === 0 ? (
              <p className="admin__hint">Пока нет платежей</p>
            ) : (
              <div className="admin__list">
                {serverCfg.payments.map((p, idx) => (
                  <div key={`${p.username}-${p.at}`} className="admin__list-item">
                    <div className="admin__list-info">
                      <span className="admin__list-name">
                        {p.status === 'paid' ? '✅' : '⏳'} @{p.username}
                      </span>
                      <span className="admin__list-sub">
                        {p.plan === 'year' ? 'Год' : 'Месяц'} · {new Date(p.at).toLocaleString('ru-RU')}
                        {p.txn ? ` · ${p.txn}` : ''}
                      </span>
                    </div>
                    <div className="admin__list-actions">
                      {p.status === 'pending' && (
                        <button className="admin__list-btn" onClick={() => handleApprovePayment(idx)}>👑 Подтвердить</button>
                      )}
                      <button className="admin__list-remove" onClick={() => handleRemovePayment(idx)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Быстрые действия */}
        <section className="admin__section">
          <h2 className="admin__section-title">⚡ Быстрые действия</h2>
          <div className="admin__actions">
            <button className="admin__action-btn" onClick={() => { localStorage.clear(); window.location.reload(); }}>
              🗑️ Очистить кэш
            </button>
            <button className="admin__action-btn" onClick={() => navigate('/premium')}>
              👑 Премиум страница
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPage;
