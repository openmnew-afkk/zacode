import React from 'react';
import { ArrowLeft, Film, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../hooks/useTelegram';
import { getStoredSeason } from '../services/seasons';
import './SynthaxAiStudio.css';

interface SynthaxAiStudioProps {
  onBackToOracle?: () => void;
  backLabel?: string;
}

export const SynthaxAiStudio: React.FC<SynthaxAiStudioProps> = ({ onBackToOracle, backLabel = 'Назад' }) => {
  const { haptic } = useTelegram();
  const navigate = useNavigate();
  const isWinter = getStoredSeason().season.id === 'winter';
  const maskSrc = isWinter ? '/zenova-mask-mini-winter.png' : '/zenova-mask-mini.png';

  return (
    <div className="syn9-studio">
      <header className="syn9-header">
        <div className="syn9-brand">
          <div className="syn9-brand__mask-wrap">
            <img src={maskSrc} alt="" className="syn9-brand__mask" />
          </div>
          <div className="syn9-brand__info">
            <span className="syn9-brand__kicker">ZENOVA · СТАТУС РАЗДЕЛА</span>
            <h2 className="syn9-brand__title">Нейросети</h2>
          </div>
        </div>
        {onBackToOracle && (
          <button
            type="button"
            className="syn9-back-btn"
            onClick={() => {
              haptic('light');
              onBackToOracle();
            }}
          >
            <ArrowLeft size={15} />
            <span>{backLabel}</span>
          </button>
        )}
      </header>

      <section className="syn9-closed" aria-label="Нейросети закрыты">
        <div className="syn9-closed__emblem">
          <Lock size={24} />
        </div>
        <span className="syn9-closed__badge">РАЗДЕЛ ЗАКРЫТ</span>
        <h3 className="syn9-closed__title">Нейросети временно отключены</h3>
        <p className="syn9-closed__desc">
          Текстовый чат-модуль нейросетей закрыт. Для мгновенного подбора фильмов и сериалов по настроению пользуйтесь разделом «Оракул» или каталогом на главной.
        </p>

        <div className="syn9-closed__actions">
          <button
            type="button"
            className="syn9-closed__btn syn9-closed__btn--primary"
            onClick={() => {
              haptic('medium');
              navigate('/ai');
            }}
          >
            <Sparkles size={15} />
            <span>Открыть Оракул</span>
          </button>
          <button
            type="button"
            className="syn9-closed__btn syn9-closed__btn--ghost"
            onClick={() => {
              haptic('light');
              navigate('/');
            }}
          >
            <Film size={15} />
            <span>На главную</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default SynthaxAiStudio;
