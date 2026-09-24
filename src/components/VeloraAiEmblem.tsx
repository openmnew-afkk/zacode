import React from 'react';
import './VeloraAiEmblem.css';

interface VeloraAiEmblemProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VeloraAiEmblem: React.FC<VeloraAiEmblemProps> = ({ size = 'md', className = '' }) => {
  return (
    <div className={`velora-ai-emblem velora-ai-emblem--${size} ${className}`} aria-label="Velora AI Neural Emblem">
      {/* Внешний рассеянный неоновый ореол нейросети */}
      <div className="velora-ai-emblem__halo" />

      {/* Быстро вращающееся внешнее хроматическое кольцо */}
      <div className="velora-ai-emblem__chroma-orbit" />

      {/* Противоположно вращающаяся нейронная орбита с узлами */}
      <div className="velora-ai-emblem__neural-ring">
        <span className="velora-ai-emblem__node velora-ai-emblem__node--1" />
        <span className="velora-ai-emblem__node velora-ai-emblem__node--2" />
        <span className="velora-ai-emblem__node velora-ai-emblem__node--3" />
      </div>

      {/* Квантовое пульсирующее ядро интеллекта */}
      <div className="velora-ai-emblem__core">
        <div className="velora-ai-emblem__core-pulse" />
        <div className="velora-ai-emblem__sparkle">✦</div>
      </div>
    </div>
  );
};

export default VeloraAiEmblem;
