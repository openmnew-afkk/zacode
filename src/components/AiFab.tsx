import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AiFab.css';

const SUGGESTIONS = [
  '🎬 Что посмотреть?',
  '🔥 Топ этой недели',
  '😄 Хочу комедию',
  '😱 Страшилка вечером',
  '🚀 Фантастика с WOW',
  '🕵️ Детектив-головоломка',
  '❤️ Романтика для двоих',
  '🧸 Семейный вечер',
];

const AiFab: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % SUGGESTIONS.length);
        setAnimating(false);
      }, 300);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  if (/^\/(movie\/|ai|admin)/.test(location.pathname)) return null;

  return (
    <button
      className={`ai-fab ${animating ? 'ai-fab--animating' : ''}`}
      onClick={() => navigate('/ai')}
      aria-label="КиноИИ"
    >
      {/* Glow ring */}
      <span className="ai-fab__glow" />

      {/* Icon */}
      <span className="ai-fab__icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="aig" x1="0" y1="0" x2="24" y2="24">
              <stop stopColor="#a78bfa"/>
              <stop offset="1" stopColor="#f472b6"/>
            </linearGradient>
          </defs>
          {/* Sparkle star */}
          <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z" fill="url(#aig)"/>
          <path d="M19 13.5l1 2.7 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1 1-2.7z" fill="#f9a8d4" opacity="0.9"/>
        </svg>
      </span>

      {/* Rotating suggestion pill */}
      <span className={`ai-fab__pill ${animating ? 'ai-fab__pill--out' : 'ai-fab__pill--in'}`}>
        {SUGGESTIONS[idx]}
      </span>
    </button>
  );
};

export default AiFab;
