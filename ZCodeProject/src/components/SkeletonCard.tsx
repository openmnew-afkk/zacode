import React from 'react';
import './SkeletonCard.css';

/* ===== Скелетон-заглушка для загрузки карточки ===== */

interface SkeletonCardProps {
  variant?: 'card' | 'wide';
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ variant = 'card' }) => {
  return (
    <div className={`skeleton-card skeleton-card--${variant}`}>
      <div className="skeleton-card__image skeleton-pulse" />
      <div className="skeleton-card__info">
        <div className="skeleton-card__title skeleton-pulse" />
        <div className="skeleton-card__subtitle skeleton-pulse" />
      </div>
    </div>
  );
};

export default SkeletonCard;
