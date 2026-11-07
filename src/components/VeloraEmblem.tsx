import React from 'react';
import './VeloraEmblem.css';

interface VeloraEmblemProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

export const VeloraEmblem: React.FC<VeloraEmblemProps> = ({ size = 'md', className = '' }) => {
  return (
    <div className={`velora-emblem velora-emblem--${size} ${className}`.trim()} role="img" aria-label="ZENOVA">
      <span className="velora-emblem__halo" aria-hidden="true" />
      <span className="velora-emblem__frame">
        <img
          src="/zenova-mask-icon.png"
          alt="ZENOVA Mask"
          className="velora-emblem__mask"
          draggable={false}
        />
        <span className="velora-emblem__eyes-glow" aria-hidden="true" />
        <span className="velora-emblem__ring" aria-hidden="true" />
        <span className="velora-emblem__glint" aria-hidden="true" />
      </span>
    </div>
  );
};

export const ZenovaEmblem = VeloraEmblem;
export default VeloraEmblem;
