import React, { useEffect, useState } from 'react';
import {
  Clapperboard, Copyright, Scale, MonitorPlay, Lock, Music4,
  Crown, Mail, ShieldCheck, ChevronDown,
} from 'lucide-react';
import { RULES_SECTIONS } from '../data/rules';
import './RulesSections.css';

const ICONS: Record<string, React.ReactNode> = {
  clapperboard: <Clapperboard size={17} />,
  copyright: <Copyright size={17} />,
  scale: <Scale size={17} />,
  monitor: <MonitorPlay size={17} />,
  lock: <Lock size={17} />,
  music: <Music4 size={17} />,
  crown: <Crown size={17} />,
  mail: <Mail size={17} />,
  shield: <ShieldCheck size={17} />,
};

const TONES: Record<string, string> = {
  clapperboard: 'rose',
  copyright: 'amber',
  scale: 'cyan',
  monitor: 'violet',
  lock: 'emerald',
  music: 'pink',
  crown: 'gold',
  mail: 'blue',
  shield: 'slate',
};

interface RulesSectionsProps {
  compact?: boolean;
  defaultOpen?: string[];
  openSignal?: { id: string; n: number } | null;
}

export const RulesSections: React.FC<RulesSectionsProps> = ({ compact = false, defaultOpen = [], openSignal = null }) => {
  const [open, setOpen] = useState<Set<string>>(() => new Set(defaultOpen));

  useEffect(() => {
    if (!openSignal) return;
    setOpen((prev) => (prev.has(openSignal.id) ? prev : new Set(prev).add(openSignal.id)));
  }, [openSignal]);

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={`rsec ${compact ? 'rsec--compact' : ''}`}>
      {RULES_SECTIONS.map((s) => {
        const isOpen = open.has(s.id);
        return (
          <section key={s.id} id={`rules-${s.id}`} className={`rsec-card ${isOpen ? 'is-open' : ''}`}>
            <button type="button" className="rsec-card__head" onClick={() => toggle(s.id)} aria-expanded={isOpen}>
              <span className={`rsec-card__icon rsec-card__icon--${TONES[s.icon] || 'slate'}`}>
                {ICONS[s.icon] || <ShieldCheck size={17} />}
              </span>
              <span className="rsec-card__copy">
                <span className="rsec-card__title">{s.title}</span>
                <span className="rsec-card__summary">{s.summary}</span>
              </span>
              <ChevronDown size={16} className="rsec-card__chev" />
            </button>
            {isOpen && (
              <div className="rsec-card__body">
                {s.items.map((item, i) => (
                  <p key={i} className="rsec-card__item">{item}</p>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default RulesSections;
