import React from 'react';
import type { SeasonId } from '../services/seasons';
import './SeasonalMask.css';

interface SeasonalMaskProps {
  season: SeasonId;
  className?: string;
}

const SeasonalMask: React.FC<SeasonalMaskProps> = ({ season, className = '' }) => (
  <span className={`seasonal-mask seasonal-mask--${season} ${className}`.trim()}>
    <img src="/zenova-universal-mask.svg" alt="" aria-hidden="true" className="seasonal-mask__base"/>
  </span>
);

export default SeasonalMask;
