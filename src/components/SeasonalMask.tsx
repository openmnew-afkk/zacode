import React from 'react';
import type { SeasonId } from '../services/seasons';
import './SeasonalMask.css';

interface SeasonalMaskProps {
  season: SeasonId;
  className?: string;
}

const SeasonalMask: React.FC<SeasonalMaskProps> = ({ season, className = '' }) => (
  <span className={`seasonal-mask seasonal-mask--${season} ${className}`.trim()}>
    <img src="/zenova-mask.svg" alt="" />
    {season === 'winter' && (
      <svg className="seasonal-mask__hat" viewBox="0 0 40 28" aria-hidden="true">
        <path d="M7 17C10 8 18 2 28 3c-2 5-2 9 2 14l-23 4Z" fill="#c9233e" />
        <path d="M6 17c7-3 16-4 26-2l3 5c-10-2-20-1-29 2Z" fill="#f3f5ff" />
        <circle cx="29" cy="4" r="4" fill="#fff" />
      </svg>
    )}
    {season === 'spring' && <span className="seasonal-mask__petal" aria-hidden="true">✿</span>}
    {season === 'summer' && <span className="seasonal-mask__spark" aria-hidden="true">✦</span>}
  </span>
);

export default SeasonalMask;
