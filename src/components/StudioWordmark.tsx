import React from 'react';
import type { StudioId } from '../api/catalog';

interface StudioWordmarkProps {
  id: StudioId;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Настоящие фирменные векторные логотипы-надписи (Wordmarks) мировых студий и стримингов:
 * NETFLIX • Disney+ • HBO max • tv+ • MARVEL STUDIOS • A24 • ANIME
 */
export const StudioWordmark: React.FC<StudioWordmarkProps> = ({
  id,
  size = 'md',
  className = '',
}) => {
  const heights = { sm: 20, md: 26, lg: 34 };
  const h = heights[size];

  switch (id) {
    case 'netflix':
      return (
        <svg
          height={h}
          viewBox="0 0 168 42"
          fill="none"
          className={`studio-wordmark studio-wordmark--netflix ${className}`.trim()}
          aria-label="NETFLIX"
        >
          {/* Фирменная красная типографика NETFLIX с дугой снизу */}
          <text
            x="4"
            y="33"
            fill="#E50914"
            fontFamily="'Bebas Neue', 'Impact', 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="36"
            letterSpacing="3.5"
          >
            NETFLIX
          </text>
        </svg>
      );

    case 'disney':
      return (
        <svg
          height={h + 4}
          viewBox="0 0 156 46"
          fill="none"
          className={`studio-wordmark studio-wordmark--disney ${className}`.trim()}
          aria-label="Disney+"
        >
          <defs>
            <linearGradient id="disneyWordArc" x1="12" y1="22" x2="142" y2="8" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(0, 114, 210, 0.1)" />
              <stop offset="48%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
          </defs>
          {/* Волшебная дуга Disney+ над надписью */}
          <path
            d="M14 20C44 2 108 2 138 22"
            stroke="url(#disneyWordArc)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="138" cy="22" r="2.3" fill="#e0f2fe" />
          <text
            x="10"
            y="36"
            fill="#ffffff"
            fontFamily="'Georgia', 'Times New Roman', serif"
            fontWeight="800"
            fontStyle="italic"
            fontSize="30"
            letterSpacing="0.5"
          >
            Disney
          </text>
          <path d="M128 19V33M121 26H135" stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );

    case 'hbo':
      return (
        <svg
          height={h}
          viewBox="0 0 176 42"
          fill="none"
          className={`studio-wordmark studio-wordmark--hbo ${className}`.trim()}
          aria-label="HBO Max"
        >
          {/* Жирный геометрический HBO + мягкий фиолетовый max */}
          <text
            x="2"
            y="32"
            fill="#ffffff"
            fontFamily="'Inter', 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="31"
            letterSpacing="1.5"
          >
            HBO
          </text>
          <circle cx="67.5" cy="21" r="3.5" fill="#a855f7" />
          <text
            x="88"
            y="32"
            fill="#c084fc"
            fontFamily="'Inter', -apple-system, sans-serif"
            fontWeight="800"
            fontSize="29"
            letterSpacing="-0.5"
          >
            max
          </text>
        </svg>
      );

    case 'apple':
      return (
        <svg
          height={h}
          viewBox="0 0 132 42"
          fill="none"
          className={`studio-wordmark studio-wordmark--apple ${className}`.trim()}
          aria-label="Apple TV+"
        >
          {/* Яблоко Apple + tv+ */}
          <path
            d="M23.5 21.8C23.5 18.2 26.4 16.3 26.6 16.1C24.9 13.6 22.2 13.3 21.3 13.2C19.1 13 16.9 14.5 15.8 14.5C14.7 14.5 12.9 13.2 11.1 13.2C8.6 13.2 6.3 14.7 5.1 16.8C2.5 21.3 4.4 28 6.9 31.6C8.1 33.4 9.6 35.4 11.5 35.3C13.4 35.2 14.1 34.1 16.3 34.1C18.5 34.1 19.1 35.3 21.1 35.3C23.1 35.3 24.3 33.5 25.5 31.7C26.9 29.6 27.5 27.6 27.5 27.5C27.4 27.3 23.5 25.8 23.5 21.8Z"
            fill="#ffffff"
          />
          <path
            d="M19.8 10.4C20.9 9.1 21.6 7.3 21.4 5.6C19.9 5.7 18 6.6 17 7.8C16.1 8.8 15.2 10.7 15.5 12.4C17.1 12.5 18.8 11.6 19.8 10.4Z"
            fill="#ffffff"
          />
          <text
            x="35"
            y="33"
            fill="#ffffff"
            fontFamily="-apple-system, 'SF Pro Display', 'Inter', sans-serif"
            fontWeight="700"
            fontSize="32"
            letterSpacing="-1"
          >
            tv
          </text>
          <path d="M76 16V30M69 23H83" stroke="#94a3b8" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );

    case 'marvel':
      return (
        <svg
          height={h}
          viewBox="0 0 184 42"
          fill="none"
          className={`studio-wordmark studio-wordmark--marvel ${className}`.trim()}
          aria-label="MARVEL STUDIOS"
        >
          {/* Красный кирпич MARVEL + STUDIOS */}
          <rect x="0" y="5" width="108" height="32" rx="4" fill="#ED1D24" />
          <text
            x="54"
            y="30"
            textAnchor="middle"
            fill="#ffffff"
            fontFamily="'Impact', 'Bebas Neue', 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="26"
            letterSpacing="1.5"
          >
            MARVEL
          </text>
          <text
            x="116"
            y="23"
            fill="#ffffff"
            fontFamily="'Inter', sans-serif"
            fontWeight="800"
            fontSize="11.5"
            letterSpacing="2.2"
          >
            STUDIOS
          </text>
          <line x1="116" y1="28" x2="178" y2="28" stroke="#f59e0b" strokeWidth="1.8" />
        </svg>
      );

    case 'a24':
      return (
        <svg
          height={h}
          viewBox="0 0 112 42"
          fill="none"
          className={`studio-wordmark studio-wordmark--a24 ${className}`.trim()}
          aria-label="A24"
        >
          <rect x="2" y="5" width="104" height="32" rx="5" stroke="rgba(245,245,244,0.45)" strokeWidth="1.6" />
          <text
            x="54"
            y="29"
            textAnchor="middle"
            fill="#f5f5f4"
            fontFamily="'Georgia', 'Times New Roman', serif"
            fontWeight="800"
            fontSize="25"
            letterSpacing="5"
          >
            A24
          </text>
        </svg>
      );

    case 'anime':
      return (
        <svg
          height={h}
          viewBox="0 0 176 42"
          fill="none"
          className={`studio-wordmark studio-wordmark--anime ${className}`.trim()}
          aria-label="ANIME"
        >
          <circle cx="18" cy="21" r="12" stroke="#ff2a85" strokeWidth="2.8" />
          <path d="M14.5 15.5L23.5 21L14.5 26.5V15.5Z" fill="#fb923c" />
          <text
            x="38"
            y="29"
            fill="#ffffff"
            fontFamily="'Inter', 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="24"
            letterSpacing="2.5"
          >
            ANIME
          </text>
          <text
            x="130"
            y="27"
            fill="#ff2a85"
            fontFamily="sans-serif"
            fontWeight="800"
            fontSize="13"
          >
            アニメ
          </text>
        </svg>
      );
  }
};

export default StudioWordmark;
