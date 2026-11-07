import React from 'react';
import type { SeasonId } from '../services/seasons';
import './SeasonalMask.css';

interface SeasonalMaskProps {
  season: SeasonId;
  className?: string;
  size?: number;
}

const SeasonalMask: React.FC<SeasonalMaskProps> = ({ season, className = '', size = 128 }) => (
  <span className={`seasonal-mask seasonal-mask--${season} ${className}`.trim()} style={{ width: size, height: size }}>
    <img src="/zenova-mask-icon.png" alt="ZENOVA" aria-hidden="true" className="seasonal-mask__base" style={{ borderRadius: '28%' }} />
    <span className="seasonal-mask__shine" aria-hidden="true" />
  </span>
);

export default SeasonalMask;
