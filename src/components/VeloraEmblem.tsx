import React, { useId } from 'react';
import './VeloraEmblem.css';

interface VeloraEmblemProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

/**
 * ZENOVA PRO Vector Emblem — авторская геометрия кибер-маски в стиле Bang & Olufsen / Apple TV+
 * Никаких размытых скриншотов из видео — чистый многослойный SVG с неоновой оптикой и титановыми гранями.
 */
export const VeloraEmblem: React.FC<VeloraEmblemProps> = ({ size = 'md', className = '' }) => {
  const uid = useId().replace(/:/g, '');

  return (
    <div
      className={`velora-emblem velora-emblem--${size} ${className}`.trim()}
      role="img"
      aria-label="ZENOVA"
    >
      <span className="velora-emblem__halo" aria-hidden="true" />
      <span className="velora-emblem__frame">
        <svg
          className="velora-emblem__svg"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {/* Фоновый обсидиановый щит */}
            <radialGradient id={`bg-${uid}`} cx="50%" cy="28%" r="75%">
              <stop offset="0%" stopColor="#1e1b2e" />
              <stop offset="55%" stopColor="#0d0b14" />
              <stop offset="100%" stopColor="#060509" />
            </radialGradient>

            {/* Титановый градиент граней маски */}
            <linearGradient id={`armor-${uid}`} x1="18" y1="12" x2="82" y2="88" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38334c" />
              <stop offset="38%" stopColor="#1f1c2e" />
              <stop offset="72%" stopColor="#12101b" />
              <stop offset="100%" stopColor="#292338" />
            </linearGradient>

            {/* Светлые грани платины */}
            <linearGradient id={`facet-${uid}`} x1="50" y1="14" x2="50" y2="84" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
              <stop offset="45%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(244,63,94,0.28)" />
            </linearGradient>

            {/* Неоновый рубиновый визор / глаза */}
            <linearGradient id={`eye-${uid}`} x1="24" y1="44" x2="76" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ff2a5f" />
              <stop offset="50%" stopColor="#fda4af" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>

            {/* Корона / Z-гребень */}
            <linearGradient id={`crest-${uid}`} x1="35" y1="16" x2="65" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="50%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>

            <filter id={`glow-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Внешнее тонкое кольцо */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="27"
            fill={`url(#bg-${uid})`}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1.5"
          />

          {/* Фоновое сияние за маской */}
          <circle cx="50" cy="48" r="30" fill="rgba(225, 29, 72, 0.16)" />

          {/* Силуэт кибер-маски (верхний купол и скулы) */}
          <path
            d="M50 13L74 23L80 46L70 73L50 87L30 73L20 46L26 23L50 13Z"
            fill={`url(#armor-${uid})`}
            stroke={`url(#facet-${uid})`}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />

          {/* Внутренние скульптурные грани лба и щёк */}
          <path
            d="M50 13L50 40M26 23L42 40M74 23L58 40"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1.1"
            strokeLinecap="round"
          />

          {/* Нижняя решётка респиратора маски */}
          <path
            d="M34 58L50 52L66 58L61 75L50 83L39 75L34 58Z"
            fill="#0b0912"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M50 54V81M42 61L40 73M58 61L60 73"
            stroke="rgba(244,63,94,0.45)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />

          {/* Гравировка символа Z на лбу маски */}
          <path
            d="M43 23H57L44 33H57"
            stroke={`url(#crest-${uid})`}
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#glow-${uid})`}
          />

          {/* Левый и правый неоновые глаза-визоры */}
          <g filter={`url(#glow-${uid})`} className="velora-emblem__optics">
            <path
              d="M25 43L45 47L42 52L27 48Z"
              fill={`url(#eye-${uid})`}
            />
            <path
              d="M75 43L55 47L58 52L73 48Z"
              fill={`url(#eye-${uid})`}
            />
            {/* Яркие блики внутри глаз */}
            <circle cx="35" cy="47.2" r="1.4" fill="#ffffff" />
            <circle cx="65" cy="47.2" r="1.4" fill="#ffffff" />
          </g>

          {/* Боковые техно-акценты на висках */}
          <path
            d="M17 38L21 44L18 52M83 38L79 44L82 52"
            stroke="#f43f5e"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
        </svg>
        <span className="velora-emblem__glint" aria-hidden="true" />
      </span>
    </div>
  );
};

export const ZenovaEmblem = VeloraEmblem;
export default VeloraEmblem;
