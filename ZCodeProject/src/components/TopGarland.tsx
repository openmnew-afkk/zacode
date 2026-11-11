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

  let pathD = `M 0,4`;
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
    // На iPhone гирлянда опускается ниже Dynamic Island (24-28px)
    const sagY = 24 + (i % 2 === 0 ? 5 : 0);

    // Провис провода
    pathD += ` Q ${midX},${sagY} ${x1},${(i + 1 === segments ? 4 : 6)}`;

    // Лампочка в нижней точке провиса
    const color = BULB_COLORS[i % BULB_COLORS.length];
    const delay = `${((i * 0.27) % 2).toFixed(2)}s`;
    bulbs.push({ cx: midX, cy: sagY, color, delay });
  }

  return (
    <aside className="top-garland" aria-hidden="true">
      <svg
        className="top-garland__svg"
        viewBox={`0 0 ${width} 58`}
        preserveAspectRatio="none"
      >
        {/* Провод */}
        <path d={pathD} className="top-garland__wire" />

        {/* Лампочки */}
        {bulbs.map((b, idx) => (
          <g key={idx} transform={`translate(${b.cx}, ${b.cy})`}>
            {/* Тёмный цоколь */}
            <rect
              x="-3"
              y="-1"
              width="6"
              height="4.5"
              rx="1"
              className="top-garland__cap"
            />
            {/* Стеклянная светящаяся колба лампы */}
            <ellipse
              cx="0"
              cy="9.5"
              rx="5"
              ry="7"
              className={`top-garland__bulb top-garland__bulb--${b.color}`}
              style={{ animationDelay: b.delay }}
            />
            {/* Внутренний яркий блик нити накаливания */}
            <circle
              cx="-1.2"
              cy="8"
              r="1.6"
              fill="#ffffff"
              opacity="0.9"
            />
          </g>
        ))}
      </svg>
    </aside>
  );
};

export default TopGarland;
