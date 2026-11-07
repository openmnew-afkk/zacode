import React from 'react';
import type { SeasonId } from '../services/seasons';
import VeloraEmblem from './VeloraEmblem';
import './SeasonalMask.css';

interface SeasonalMaskProps {
  season: SeasonId;
  className?: string;
  size?: number;
}

const SeasonalMask: React.FC<SeasonalMaskProps> = ({ season, className = '', size = 116 }) => (
  <span
    className={`seasonal-mask seasonal-mask--${season} ${className}`.trim()}
    style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
  >
    <VeloraEmblem size="hero" seasonOverride={season} />
  </span>
);

export default SeasonalMask;
