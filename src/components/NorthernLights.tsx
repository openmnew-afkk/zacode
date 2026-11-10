import React, { useEffect, useState } from 'react';
import './NorthernLights.css';

interface NorthernLightsProps {
  season?: string;
}

export const NorthernLights: React.FC<NorthernLightsProps> = ({ season = 'winter' }) => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zenova_aurora_off') !== '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const checkState = () => {
      try {
        setEnabled(localStorage.getItem('zenova_aurora_off') !== '1');
      } catch {
        setEnabled(true);
      }
    };

    window.addEventListener('zenova-aurora-toggle', checkState);
    window.addEventListener('zenova-fx-change', checkState);
    window.addEventListener('storage', checkState);
    return () => {
      window.removeEventListener('zenova-aurora-toggle', checkState);
      window.removeEventListener('zenova-fx-change', checkState);
      window.removeEventListener('storage', checkState);
    };
  }, []);

  if (season !== 'winter' || !enabled) {
    return null;
  }

  return (
    <aside className="northern-lights" aria-hidden="true">
      <div className="northern-lights__stage">
        <div className="northern-lights__ribbon--emerald" />
        <div className="northern-lights__ribbon--cyan" />
        <div className="northern-lights__ribbon--violet" />
        <div className="northern-lights__curtain" />
      </div>
    </aside>
  );
};

export default NorthernLights;
