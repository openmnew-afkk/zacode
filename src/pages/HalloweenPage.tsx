import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HalloweenPage.css';

const bats = [
  { className: 'hw-bat hw-bat--one', scale: 1 },
  { className: 'hw-bat hw-bat--two', scale: 0.7 },
  { className: 'hw-bat hw-bat--three', scale: 1.15 },
  { className: 'hw-bat hw-bat--four', scale: 0.55 },
  { className: 'hw-bat hw-bat--five', scale: 0.85 },
  { className: 'hw-bat hw-bat--six', scale: 0.65 },
];

const HalloweenPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="hw-page page">
      <div className="hw-sky" aria-hidden="true">
        <div className="hw-moon" />
        {bats.map((bat) => (
          <svg key={bat.className} className={bat.className} viewBox="0 0 64 34" style={{ transform: `scale(${bat.scale})` }}>
            <path d="M32 13c-5-8-11-10-19-9 4 5 5 9 4 13-5-5-10-6-16-5 5 4 8 9 9 15 7-1 13-4 18-9l4 7 4-7c5 5 11 8 18 9 1-6 4-11 9-15-6-1-11 0-16 5-1-4 0-8 4-13-8-1-14 1-19 9Z" />
          </svg>
        ))}
        <span className="hw-fog hw-fog--one" />
        <span className="hw-fog hw-fog--two" />
      </div>

      <header className="hw-header">
        <button className="hw-back" type="button" onClick={() => navigate('/')} aria-label="Вернуться на главную">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m14.5 18-6-6 6-6" />
          </svg>
        </button>
        <span className="hw-header__label">ZENOVA AFTER DARK</span>
        <img src="/zenova-mask.svg" alt="" className="hw-header__mask" />
      </header>

      <section className="hw-hero" aria-labelledby="hw-title">
        <div className="hw-seal" aria-hidden="true">
          <span className="hw-seal__orbit" />
          <img src="/zenova-mask.svg" alt="" />
        </div>
        <p className="hw-kicker"><span /> ПОСЛЕ ЗАКАТА ПРАВИЛА МЕНЯЮТСЯ</p>
        <h1 id="hw-title">Ты точно<br />здесь <em>один?</em></h1>
        <p className="hw-copy">
          За дверью уже шуршат крылья. Не оборачивайся — просто выбери, какую историю посмотреть этой ночью.
        </p>
        <button className="hw-cta" type="button" onClick={() => navigate('/')}>
          <span>Войти в кинотеатр</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </button>
        <span className="hw-whisper">ЕСЛИ УСЛЫШИШЬ СТУК — НЕ ОТКРЫВАЙ</span>
      </section>

      <div className="hw-bottom" aria-hidden="true">
        <span>31</span>
        <i />
        <span>10</span>
        <i />
        <span>Ночь историй</span>
      </div>
    </main>
  );
};

export default HalloweenPage;
