import React from 'react';
import './VeloraEmblem.css';

interface VeloraEmblemProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

export const VeloraEmblem: React.FC<VeloraEmblemProps> = ({ size = 'md', className = '' }) => {
  return (
    <div className={`velora-emblem velora-emblem--${size} ${className}`} aria-label="VELORA Emblem">
      {/* Внешний диффузный неоновый ореол */}
      <div className="velora-emblem__halo" />

      {/* Вращающееся хроматическое кольцо */}
      <div className="velora-emblem__chroma-ring" />

      {/* Обратно вращающееся орбитальное кольцо со спутником */}
      <div className="velora-emblem__orbit-ring">
        <span className="velora-emblem__satellite" />
      </div>

      {/* Квантовое пульсирующее ядро со световой линзой */}
      <div className="velora-emblem__core">
        <div className="velora-emblem__core-inner" />
        <div className="velora-emblem__core-flare" />
      </div>

      {/* Тонкие кинематографичные лазерные лучи */}
      <div className="velora-emblem__cross" />
    </div>
  );
};

export default VeloraEmblem;
