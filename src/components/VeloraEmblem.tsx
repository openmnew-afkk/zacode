import React from 'react';
import './VeloraEmblem.css';

interface VeloraEmblemProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

export const VeloraEmblem: React.FC<VeloraEmblemProps> = ({ size = 'md', className = '' }) => {
  return (
    <div className={`velora-emblem velora-emblem--${size} ${className}`} role="img" aria-label="ZENOVA">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <rect x="3" y="3" width="94" height="94" rx="28" fill="#100d18" />
        <rect x="4" y="4" width="92" height="92" rx="27" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
        <circle cx="50" cy="50" r="32" fill="rgba(168,85,247,0.08)" />
        <circle cx="50" cy="50" r="28" fill="none" stroke="#fb7185" strokeWidth="3.5" />
        <circle cx="50" cy="50" r="21" fill="none" stroke="#a78bfa" strokeOpacity="0.76" strokeWidth="1.5" />
        <path d="M45 38.5a2 2 0 0 1 3-1.7l19 11a2.5 2.5 0 0 1 0 4.4l-19 11a2 2 0 0 1-3-1.7z" fill="#fff" />
        <circle cx="73" cy="27" r="2.5" fill="#fda4af" />
      </svg>
    </div>
  );
};

export const ZenovaEmblem = VeloraEmblem;
export default VeloraEmblem;
