import React, { useState, useRef, useEffect, useCallback } from 'react';
import './YandexGlowInput.css';

export interface YandexGlowInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onClear?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export const YandexGlowInput: React.FC<YandexGlowInputProps> = ({
  value,
  onChange,
  placeholder = 'Поиск...',
  autoFocus = false,
  onClear,
  className = '',
  icon,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [lastTypedIdx, setLastTypedIdx] = useState<number | null>(null);
  const [glowTick, setGlowTick] = useState<number>(0);
  const prevValRef = useRef(value);

  /* Отслеживаем добавленные символы для подсветки последней буквы как в Яндекс Музыке */
  useEffect(() => {
    const prev = prevValRef.current;
    if (value.length > prev.length) {
      // Добавился символ (или несколько)
      setLastTypedIdx(value.length - 1);
      setGlowTick((t) => t + 1);
    } else {
      setLastTypedIdx(null);
    }
    prevValRef.current = value;
  }, [value]);

  /* Синхронизация горизонтального скролла при длинном тексте */
  const handleScroll = useCallback(() => {
    if (inputRef.current && scrollRef.current) {
      scrollRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  }, []);

  const handleClear = () => {
    onChange('');
    setLastTypedIdx(null);
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={`ygi-wrapper ${className}`}>
      {icon && <span className="ygi-icon" aria-hidden="true">{icon}</span>}

      <div className="ygi-field">
        {/* Слой отображения с неоновой подсветкой символов */}
        <div
          ref={scrollRef}
          className="ygi-display"
          aria-hidden="true"
        >
          {value.length === 0 ? (
            <span className="ygi-placeholder">{placeholder}</span>
          ) : (
            value.split('').map((ch, idx) => {
              const isLast = idx === lastTypedIdx;
              const isSpace = ch === ' ';
              return (
                <span
                  key={`${idx}-${isLast ? glowTick : 'st'}`}
                  className={`ygi-char ${isLast ? 'ygi-char--glow' : ''} ${isSpace ? 'ygi-char--space' : ''}`}
                >
                  {isSpace ? '\u00A0' : ch}
                  {isLast && (
                    <span className="ygi-spark" aria-hidden="true" />
                  )}
                </span>
              );
            })
          )}
        </div>

        {/* Настоящий прозрачный input для клавиатуры, курсора и доступности */}
        <input
          ref={inputRef}
          type="text"
          className="ygi-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-label={placeholder}
        />
      </div>

      {value && (
        <button
          type="button"
          className="ygi-clear-btn"
          onClick={handleClear}
          aria-label="Очистить"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default YandexGlowInput;
