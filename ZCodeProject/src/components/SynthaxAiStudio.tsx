import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp, Crown, Film, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { askSynthax, fetchPremiumStatus } from '../api/backend';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import { getStoredSeason } from '../services/seasons';
import './SynthaxAiStudio.css';

interface SynthaxAiStudioProps {
  onBackToOracle?: () => void;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'Подбери три фильма для уютного вечера и объясни выбор',
  'Что посмотреть после «Интерстеллара», если хочется сильной драмы?',
  'Составь план из пяти сериалов на выходные без спойлеров',
];

export const SynthaxAiStudio: React.FC<SynthaxAiStudioProps> = ({ onBackToOracle }) => {
  const { haptic } = useTelegram();
  const { applyRemotePremium } = useStore();
  const navigate = useNavigate();
  const isWinter = getStoredSeason().season.id === 'winter';
  const maskSrc = isWinter ? '/zenova-mask-mini-winter.png' : '/zenova-mask-mini.png';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [premium, setPremium] = useState(false);
  const [model, setModel] = useState('Базовый ИИ');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetchPremiumStatus().then((status) => {
      if (!active) return;
      setPremium(status.premium);
      if (status.premium) applyRemotePremium(status.expiry);
      if (status.ai) {
        setRemaining(status.ai.remaining);
        setLimit(status.ai.limit);
        setModel(status.premium ? 'Kimi K3.1 Pro' : status.ai.model);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [applyRemotePremium]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  const send = async (text = prompt) => {
    const clean = text.trim();
    if (!clean || loading) return;
    haptic('medium');
    setPrompt('');
    setError('');
    setLoading(true);
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: clean }]);
    try {
      const response = await askSynthax(clean);
      setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', text: response.text }]);
      setPremium(response.premium);
      setModel(response.premium ? 'Kimi K3.1 Pro' : response.model);
      setRemaining(response.remaining);
      setLimit(response.limit);
      haptic('light');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'SYNTHAX временно недоступен');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="syn-studio">
      <header className="syn-header">
        <div className="syn-brand">
          <div className="syn-brand__mask-wrap"><img src={maskSrc} alt="" className="syn-brand__mask" /></div>
          <div className="syn-brand__info">
            <span className="syn-brand__kicker">ZENOVA AI CONCIERGE</span>
            <h2 className="syn-brand__title">SYNTHAX</h2>
          </div>
        </div>
        <button type="button" className="syn-header-back-btn" onClick={() => { haptic('light'); onBackToOracle?.(); }} aria-label="Вернуться к Оракулу">
          <ArrowLeft size={15} /><span>Оракул</span>
        </button>
      </header>

      <section className={`syn-mode ${premium ? 'syn-mode--premium' : ''}`}>
        <div className="syn-mode__icon">{premium ? <Crown size={19} /> : <Sparkles size={19} />}</div>
        <div>
          <strong>{premium ? 'Kimi K3.1 Pro' : 'SYNTHAX Basic'}</strong>
          <span>{model} · {remaining === null ? 'проверяем лимит' : `осталось ${remaining} из ${limit} сегодня`}</span>
        </div>
        {!premium && <button type="button" onClick={() => navigate('/premium')}>PRO</button>}
      </section>

      <section className="syn-chat" aria-live="polite">
        {messages.length === 0 && (
          <div className="syn-welcome">
            <span className="syn-welcome__icon"><Film size={25} /></span>
            <h3>Ваш кино-консьерж</h3>
            <p>Спросите о настроении, сравнении фильмов или плане просмотра. Ответы формирует внешняя ИИ-модель, поэтому факты стоит проверять.</p>
            <div className="syn-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => void send(suggestion)} disabled={loading}>{suggestion}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <article key={message.id} className={`syn-message syn-message--${message.role}`}>
            <span>{message.role === 'assistant' ? 'SYNTHAX' : 'ВЫ'}</span>
            <p>{message.text}</p>
          </article>
        ))}
        {loading && <div className="syn-thinking"><i /><i /><i /><span>SYNTHAX обдумывает ответ</span></div>}
        {error && <p className="syn-error" role="alert">{error}</p>}
        <div ref={endRef} />
      </section>

      <form className="syn-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <label htmlFor="syn-prompt" className="sr-only">Запрос к SYNTHAX</label>
        <textarea
          id="syn-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value.slice(0, 1200))}
          placeholder="Например: фантастика без космоса, но с неожиданным финалом…"
          rows={3}
          maxLength={1200}
          disabled={loading}
        />
        <div className="syn-composer__bottom">
          <span>{prompt.length}/1200 · не отправляйте личные данные</span>
          <button type="submit" disabled={!prompt.trim() || loading} aria-label="Отправить запрос"><ArrowUp size={19} /></button>
        </div>
      </form>
    </div>
  );
};

export default SynthaxAiStudio;
