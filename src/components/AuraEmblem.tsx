import React from 'react';
import './AuraEmblem.css';

interface AuraEmblemProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

export const AuraEmblem: React.FC<AuraEmblemProps> = ({ size = 'md', className = '' }) => {
  return (
    <div className={`aura-emblem aura-emblem--${size} ${className}`} aria-label="AURA Emblem">
      {/* Внешний диффузный неоновый ореол */}
      <div className="aura-emblem__halo" />

      {/* Вращающееся хроматическое кольцо */}
      <div className="aura-emblem__chroma-ring" />

      {/* Обратно вращающееся орбитальное кольцо с частицами */}
      <div className="aura-emblem__orbit-ring">
        <span className="aura-emblem__satellite" />
      </div>

      {/* Квантовое пульсирующее ядро со световой линзой */}
      <div className="aura-emblem__core">
        <div className="aura-emblem__core-inner" />
        <div className="aura-emblem__core-flare" />
      </div>

      {/* Тонкие кинематографичные лазерные лучи */}
      <div className="aura-emblem__cross" />
    </div>
  );
};

export default AuraEmblem;
