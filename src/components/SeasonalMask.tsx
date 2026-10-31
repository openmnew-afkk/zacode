import React from 'react';
import type { SeasonId } from '../services/seasons';
import './SeasonalMask.css';

const MASK_SRC: Record<SeasonId, string> = {
  winter: '/zenova-winter-mask.svg',
  spring: '/zenova-spring-mask.svg',
  summer: '/zenova-summer-mask.svg',
  autumn: '/zenova-autumn-mask.svg',
  none: '/zenova-universal-mask.svg',
};

interface SeasonalMaskProps {
  season: SeasonId;
  className?: string;
  size?: number;
}

const SeasonalMask: React.FC<SeasonalMaskProps> = ({ season, className = '', size = 128 }) => (
  <span className={`seasonal-mask seasonal-mask--${season} ${className}`.trim()} style={{ width: size, height: size }}>
    <img src={MASK_SRC[season]} alt="" aria-hidden="true" className="seasonal-mask__base"/>
    <span className="seasonal-mask__shine" aria-hidden="true" />
  </span>
);

export default SeasonalMask;
