import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { getRuProxy, setRuProxy, testRuProxy } from '../api/players';
import './AdminPage.css';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, adminLogin, adminLogout, adsEnabled, setAdsEnabled, announcement, setAnnouncement, isPremium } = useStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  /* ── RU-Proxy (обход гео-блока русских плееров при VPN) ── */
  const [proxyUrl, setProxyUrl] = useState<string>(() => getRuProxy());
  const [proxyStatus, setProxyStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [proxyTesting, setProxyTesting] = useState(false);
  const [proxySaved, setProxySaved] = useState(false);

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
      setPassword('');
      setError('');
    } else {
      setAttempts(a => a + 1);
      setError(`❌ Неверный пароль (${attempts + 1}/5)`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin">
        <button className="admin__back" onClick={() => navigate(-1)}>← Назад</button>
        <div className="admin__login">
          <div className="admin__lock">🔐</div>
          <h1 className="admin__title">Админ панель</h1>
          <p className="admin__desc">Введите пароль администратора</p>
          <input
            className="admin__input"
            type="password"
            placeholder="Пароль"
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
        <h1 className="admin__title">⚙️ Админ панель</h1>
        <button className="admin__logout" onClick={adminLogout}>Выйти</button>
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

        {/* Реклама */}
        <section className="admin__section">
          <h2 className="admin__section-title">📺 Реклама</h2>
          <label className="admin__toggle">
            <span>Показывать рекламу</span>
            <input type="checkbox" checked={adsEnabled} onChange={e => setAdsEnabled(e.target.checked)} />
            <span className="admin__toggle-slider" />
          </label>
        </section>

        {/* Объявление */}
        <section className="admin__section">
          <h2 className="admin__section-title">📢 Объявление</h2>
          <textarea
            className="admin__textarea"
            placeholder="Текст объявления (пустое = скрыто)"
            value={announcement}
            onChange={e => setAnnouncement(e.target.value)}
            rows={3}
          />
        </section>

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
