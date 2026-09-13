import React from 'react';

export const PlayIcon: React.FC<{ size?: number; active?: boolean }> = ({ size = 20, active = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path 
      d={active ? "M8 6v12l9-6z" : "M8 6v12l9-6z"} 
      fill={active ? "currentColor" : "none"}
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinejoin="round"
    />
  </svg>
);

export const PauseIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 5v14h4V5H6z" fill="currentColor"/>
    <path d="M14 5v14h4V5h-4z" fill="currentColor"/>
  </svg>
);

export const NextIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M7 6l9.5 6L7 18V6z" fill="currentColor"/>
    <path d="M17 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const PrevIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M17 6L7.5 12L17 18V6z" fill="currentColor"/>
    <path d="M7 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const ShuffleIcon: React.FC<{ size?: number; active?: boolean }> = ({ size = 18, active = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path 
      d="M4 16l5-5a4 4 0 0 1 6.37-.14L19 15" 
      fill="none"
      stroke="currentColor" 
      strokeWidth={active ? "2" : "1.6"} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <circle cx="7" cy="7" r="2.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6"/>
    <circle cx="17" cy="17" r="2.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6"/>
    <path d="M15 10l4-4v4l-4 0z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
  </svg>
);

export const RepeatIcon: React.FC<{ size?: number; active?: boolean }> = ({ size = 18, active = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path 
      d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 9 9 9 9 0 0 1-9 9 9 9 0 0 1-9-9z" 
      fill="none"
      stroke="currentColor" 
      strokeWidth={active ? "2" : "1.6"} 
      strokeLinecap="round"
    />
    <path 
      d="M12 7v5l2 2" 
      fill="none"
      stroke="currentColor" 
      strokeWidth={active ? "2" : "1.6"} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    {active && (
      <circle cx="12" cy="12" r="2.5" fill="currentColor" fillOpacity="0.3"/>
    )}
  </svg>
);

export const HeartIcon: React.FC<{ size?: number; filled?: boolean }> = ({ size = 18, filled = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
    <path 
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      stroke="currentColor" 
      strokeWidth="1.6" 
      strokeLinejoin="round"
    />
  </svg>
);

export const ChevronDownIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const MusicNoteIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path 
      d="M9 18V5l8-3v13" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <circle cx="9" cy="18" r="3" fill="none" stroke="currentColor" strokeWidth="2"/>
    <circle cx="17" cy="16" r="3" fill="none" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

export const ExpandIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const VolumeIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M11 5L6 9l-2 2-2 2 2 2 4 4z" fill="currentColor"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.08M12.5 5v2m0 10v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const TrackRunningIcon: React.FC<{ size?: number; active?: boolean }> = ({ size = 16, active = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle 
      cx="12" 
      cy="12" 
      r="8" 
      fill={active ? "currentColor" : "none"}
      stroke="currentColor" 
      strokeWidth={active ? "2" : "1.6"}
    />
    <path 
      d="M12 7v5l2 2" 
      fill="none"
      stroke="currentColor" 
      strokeWidth={active ? "2" : "1.6"} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    {active && (
      <path 
        d="M4 12a8 8 0 0 1 15.5-.5" 
        fill="none"
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    )}
  </svg>
);