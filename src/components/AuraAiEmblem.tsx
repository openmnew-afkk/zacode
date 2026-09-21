import React from 'react';
import './AuraAiEmblem.css';

interface AuraAiEmblemProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AuraAiEmblem: React.FC<AuraAiEmblemProps> = ({ size = 'md', className = '' }) => {
  return (
    <div className={`aura-ai-emblem aura-ai-emblem--${size} ${className}`} aria-label="Aura AI Neural Emblem">
      {/* Внешний рассеянный неоновый ореол нейросети */}
      <div className="aura-ai-emblem__halo" />

      {/* Быстро вращающееся внешнее хроматическое кольцо */}
      <div className="aura-ai-emblem__chroma-orbit" />

      {/* Противоположно вращающаяся нейронная орбита с узлами */}
      <div className="aura-ai-emblem__neural-ring">
        <span className="aura-ai-emblem__node aura-ai-emblem__node--1" />
        <span className="aura-ai-emblem__node aura-ai-emblem__node--2" />
        <span className="aura-ai-emblem__node aura-ai-emblem__node--3" />
      </div>

      {/* Квантовое пульсирующее ядро интеллекта */}
      <div className="aura-ai-emblem__core">
        <div className="aura-ai-emblem__core-pulse" />
        <div className="aura-ai-emblem__sparkle">✦</div>
      </div>
    </div>
  );
};

export default AuraAiEmblem;
