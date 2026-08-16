import React, { useState } from 'react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import './AdminPage.css';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, adminLogin, adminLogout, adsEnabled, setAdsEnabled, announcement, setAnnouncement, isPremium } = useStore();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

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
