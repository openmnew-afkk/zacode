import React, { useEffect, useState } from 'react';
import { getStoredSeason, type SeasonId } from '../services/seasons';
import './VeloraEmblem.css';

interface VeloraEmblemProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  seasonOverride?: SeasonId;
  className?: string;
}

/**
 * Фирменный знак ZENOVA:
 * • В зимней (новогодней) теме ('winter') — маска в новогодней шапке Санты (/zenova-mask-winter.png)
 * • Во всех остальных темах — фирменная маска в кепке NY (/zenova-mask-default.png)
 */
export const VeloraEmblem: React.FC<VeloraEmblemProps> = ({
  size = 'md',
  seasonOverride,
  className = '',
}) => {
  const [seasonId, setSeasonId] = useState<SeasonId>(() => getStoredSeason().season.id);

  useEffect(() => {
    const sync = () => setSeasonId(getStoredSeason().season.id);
    window.addEventListener('zenova-season-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('zenova-season-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const effectiveSeason = seasonOverride ?? seasonId;
  const isWinter = effectiveSeason === 'winter';
  const imgSrc = isWinter ? '/zenova-mask-winter.png' : '/zenova-mask-default.png';

  return (
    <div
      className={`velora-emblem velora-emblem--${size} ${
        isWinter ? 'velora-emblem--winter' : 'velora-emblem--default'
      } ${className}`.trim()}
      role="img"
      aria-label="ZENOVA"
    >
      <span className="velora-emblem__halo" aria-hidden="true" />
      <img
        src={imgSrc}
        alt="ZENOVA"
        className="velora-emblem__img"
        draggable={false}
      />
    </div>
  );
};

export const ZenovaEmblem = VeloraEmblem;
export default VeloraEmblem;
