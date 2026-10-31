import React from 'react';
import type { SeasonId } from '../services/seasons';
import './SeasonalMask.css';

interface SeasonalMaskProps {
  season: SeasonId;
  className?: string;
}

const SeasonalMask: React.FC<SeasonalMaskProps> = ({ season, className = '' }) => (
  <span className={`seasonal-mask seasonal-mask--${season} ${className}`.trim()}>
    <img src="/zenova-mask.svg" alt="" aria-hidden="true" className="seasonal-mask__base"/>
    {season === 'winter' && (
      <span className="seasonal-mask__winter" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
          <path className="tab-bar__season-tree" d="m32 14-13 17h7L14 44h12L10 56h44L38 44h12L38 31h7L32 14Z"/>
          <path className="tab-bar__season-snow" d="M22 31h20M16 44h32M14 55h36"/>
          <circle className="tab-bar__season-light" cx="32" cy="27" r="2"/>
          <circle className="tab-bar__season-light" cx="25" cy="39" r="1.7"/>
          <circle className="tab-bar__season-light" cx="39" cy="39" r="1.7"/>
        </svg>
      </span>
    )}
    {season === 'autumn' && (
      <span className="seasonal-mask__autumn" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
          <path className="tab-bar__season-pumpkin" d="M31 22c-3-4-10-2-12 3-8-3-13 4-13 13 0 10 5 17 14 17 4 0 7-2 10-4 3 2 6 4 10 4 9 0 14-7 14-17 0-9-5-16-13-13-2-5-9-7-13-3h3Z"/>
          <path className="tab-bar__season-leaf" d="M47 13c-7 0-12 4-14 11 7 0 12-4 14-11Z"/>
          <path className="tab-bar__season-stem" d="M33 25c4-5 8-8 13-11"/>
        </svg>
      </span>
    )}
  </span>
);

export default SeasonalMask;
