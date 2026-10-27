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
      <svg className="seasonal-mask__hat" viewBox="0 0 64 48" aria-hidden="true">
        <path d="M8 34C17 16 31 7 50 6c-4 10-1 18 8 25L8 42Z" fill="#c9233e" />
        <path d="M7 34c16-6 34-8 51-3l4 9c-19-4-37-2-54 4Z" fill="#f3f5ff" />
        <path d="M13 34c12-4 25-6 38-5" fill="none" stroke="#fff" strokeOpacity=".78" strokeWidth="2" strokeLinecap="round" />
        <circle cx="50" cy="6" r="5" fill="#fff" />
      </svg>
    )}
    {season === 'spring' && <span className="seasonal-mask__petal" aria-hidden="true">✿</span>}
    {season === 'summer' && <span className="seasonal-mask__spark" aria-hidden="true">✦</span>}
  </span>
);

export default SeasonalMask;
