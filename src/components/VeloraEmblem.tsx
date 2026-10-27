import React from 'react';
import './VeloraEmblem.css';

interface VeloraEmblemProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

export const VeloraEmblem: React.FC<VeloraEmblemProps> = ({ size = 'md', className = '' }) => {
  return (
    <div className={`velora-emblem velora-emblem--${size} ${className}`} role="img" aria-label="ZENOVA">
      <span className="velora-emblem__frame">
        <span className="velora-emblem__halo" />
        <span className="velora-emblem__orbit velora-emblem__orbit--outer"><i /></span>
        <span className="velora-emblem__orbit velora-emblem__orbit--inner" />
        <span className="velora-emblem__core">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M19 13.8a2.4 2.4 0 0 1 3.6-2.08l17.2 9.94a2.7 2.7 0 0 1 0 4.68L22.6 36.28A2.4 2.4 0 0 1 19 34.2z" fill="currentColor" />
          </svg>
        </span>
        <span className="velora-emblem__glint" />
      </span>
    </div>
  );
};

export const ZenovaEmblem = VeloraEmblem;
export default VeloraEmblem;
