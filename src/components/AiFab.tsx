import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AiFab.css';

/* Плавающая кнопка КиноИИ — видна на всех основных страницах */
const AiFab: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  /* Скрываем на странице фильма, самом ИИ и в админке */
  if (/^\/(movie\/|ai|admin)/.test(location.pathname)) return null;

  return (
    <button className="ai-fab" onClick={() => navigate('/ai')} aria-label="КиноИИ — что посмотреть">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z" fill="currentColor" />
        <path d="M19 13.5l1 2.7 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1 1-2.7z" fill="currentColor" opacity="0.85" />
      </svg>
    </button>
  );
};

export default AiFab;
