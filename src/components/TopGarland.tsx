import React, { useEffect, useState } from 'react';
import './TopGarland.css';

interface TopGarlandProps {
  season?: string;
}

const BULB_COLORS = ['ruby', 'gold', 'emerald', 'blue', 'violet', 'amber'] as const;

export const TopGarland: React.FC<TopGarlandProps> = ({ season = 'winter' }) => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zenova_garland_off') !== '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const checkState = () => {
      try {
        setEnabled(localStorage.getItem('zenova_garland_off') !== '1');
      } catch {
        setEnabled(true);
      }
    };

    window.addEventListener('zenova-garland-toggle', checkState);
    window.addEventListener('zenova-fx-change', checkState);
    window.addEventListener('storage', checkState);
    return () => {
      window.removeEventListener('zenova-garland-toggle', checkState);
      window.removeEventListener('zenova-fx-change', checkState);
      window.removeEventListener('storage', checkState);
    };
  }, []);

  if (season !== 'winter' || !enabled) {
    return null;
  }

  // 14 гирляндных провисов по ширине 1200px (адаптируется через SVG viewBox)
  const segments = 14;
  const width = 1200;
  const step = width / segments;

  let pathD = `M 0,0`;
  const bulbs: Array<{
    cx: number;
    cy: number;
    color: (typeof BULB_COLORS)[number];
    delay: string;
  }> = [];

  for (let i = 0; i < segments; i++) {
    const x0 = i * step;
    const x1 = (i + 1) * step;
    const midX = x0 + step / 2;
    const sagY = 16 + (i % 2 === 0 ? 3 : 0); // небольшая естественная асимметрия

    // Провис провода
    pathD += ` Q ${midX},${sagY} ${x1},${(i + 1 === segments ? 0 : 4)}`;

    // Лампочка в нижней точке провиса
    const color = BULB_COLORS[i % BULB_COLORS.length];
    const delay = `${((i * 0.27) % 2).toFixed(2)}s`;
    bulbs.push({ cx: midX, cy: sagY, color, delay });
  }

  return (
    <aside className="top-garland" aria-hidden="true">
      <svg
        className="top-garland__svg"
        viewBox={`0 0 ${width} 44`}
        preserveAspectRatio="none"
      >
        {/* Провод */}
        <path d={pathD} className="top-garland__wire" />

        {/* Лампочки */}
        {bulbs.map((b, idx) => (
          <g key={idx} transform={`translate(${b.cx}, ${b.cy})`}>
            {/* Тёмный цоколь */}
            <rect
              x="-2.5"
              y="-1"
              width="5"
              height="3.5"
              rx="0.8"
              className="top-garland__cap"
            />
            {/* Стеклянная светящаяся колба лампы */}
            <ellipse
              cx="0"
              cy="7.5"
              rx="4"
              ry="5.5"
              className={`top-garland__bulb top-garland__bulb--${b.color}`}
              style={{ animationDelay: b.delay }}
            />
            {/* Внутренний яркий блик нити накаливания */}
            <circle
              cx="-0.8"
              cy="6"
              r="1.2"
              fill="#ffffff"
              opacity="0.85"
            />
          </g>
        ))}
      </svg>
    </aside>
  );
};

export default TopGarland;
