import React, { useState, useRef } from 'react';
import './SearchBar.css';

/* ===== Поисковая строка ===== */

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Поиск фильмов...',
}) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={`search-bar ${focused ? 'search-bar--focused' : ''}`}>
      <div className="search-bar__icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <input
        ref={inputRef}
        className="search-bar__input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {value && (
        <button className="search-bar__clear" onClick={handleClear} aria-label="Очистить">
          ✕
        </button>
      )}
    </div>
  );
};

export default SearchBar;
