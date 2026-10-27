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
        <path d="M8 19C13 8 21 5 31 5c-4 4-5 8-2 13l-21 5Z" fill="#c9233e" />
        <path d="M7 20c7-3 15-4 24-2l3 5c-9-2-17-1-26 2Z" fill="#f3f5ff" />
        <circle cx="31" cy="5" r="4" fill="#fff" />
      </svg>
    )}
    {season === 'spring' && <span className="seasonal-mask__petal" aria-hidden="true">✿</span>}
    {season === 'summer' && <span className="seasonal-mask__spark" aria-hidden="true">✦</span>}
  </span>
);

export default SeasonalMask;
