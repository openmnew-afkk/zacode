import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp, Crown, Film, Lock, Sparkles, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { askSynthax, fetchPremiumStatus } from '../api/backend';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import { getStoredSeason } from '../services/seasons';
import './SynthaxAiStudio.css';

interface SynthaxAiStudioProps {
  onBackToOracle?: () => void;
  backLabel?: string;
}

type ModelId = 'deepseek' | 'gemini' | 'kimi';

interface ModelOption {
  id: ModelId;
  name: string;
  tag: string;
  desc: string;
  proOnly: boolean;
}

const MODELS: ModelOption[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek V3',
    tag: 'FREE',
    desc: 'Быстрый умный подбор',
    proOnly: false,
  },
  {
    id: 'gemini',
    name: 'Gemini 2.5 Pro',
    tag: 'PRO',
    desc: 'Кино-эксперт Google',
    proOnly: true,
  },
  {
    id: 'kimi',
    name: 'Kimi K3.1 Pro',
    tag: 'PRO',
    desc: 'Глубокий разбор сюжета',
    proOnly: true,
  },
];

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  modelName?: string;
}

const SUGGESTIONS = [
  'Подбери 3 фильма для уютного вечера с неожиданным финалом',
  'Что посмотреть после «Интерстеллара», если хочется сильной драмы?',
  'Составь список из 5 мини-сериалов на выходные без спойлеров',
];

export const SynthaxAiStudio: React.FC<SynthaxAiStudioProps> = ({ onBackToOracle, backLabel = 'Назад' }) => {
  const { haptic } = useTelegram();
  const { isPremium, applyRemotePremium } = useStore();
  const navigate = useNavigate();
  const isWinter = getStoredSeason().season.id === 'winter';
  const maskSrc = isWinter ? '/zenova-mask-mini-winter.png' : '/zenova-mask-mini.png';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverPremium, setServerPremium] = useState(isPremium);
  const [selectedModel, setSelectedModel] = useState<ModelId>(isPremium ? 'gemini' : 'deepseek');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const effectivePro = serverPremium || isPremium;

  useEffect(() => {
    let active = true;
    fetchPremiumStatus()
      .then((status) => {
        if (!active) return;
        setServerPremium(status.premium);
        if (status.premium) {
          applyRemotePremium(status.expiry);
          setSelectedModel((prev) => (prev === 'deepseek' ? 'gemini' : prev));
        }
        if (status.ai) {
          setRemaining(status.ai.remaining);
          setLimit(status.ai.limit);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [applyRemotePremium]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, loading]);

  const handleSelectModel = (m: ModelOption) => {
    haptic('light');
    if (m.proOnly && !effectivePro) {
      setError(`Модель ${m.name} доступна в ZENOVA PRO (10 запросов в день).`);
      return;
    }
    setError('');
    setSelectedModel(m.id);
  };

  const send = async (text = prompt) => {
    const clean = text.trim();
    if (!clean || loading) return;

    const currentOpt = MODELS.find((m) => m.id === selectedModel) || MODELS[0];
    if (currentOpt.proOnly && !effectivePro) {
      setError(`Переключитесь на DeepSeek V3 или откройте ZENOVA PRO для доступа к ${currentOpt.name}.`);
      return;
    }

    haptic('medium');
    setPrompt('');
    setError('');
    setLoading(true);
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: clean }]);
    try {
      const response = await askSynthax(clean, selectedModel);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: response.text,
          modelName: response.model || currentOpt.name,
        },
      ]);
      setServerPremium(response.premium);
      setRemaining(response.remaining);
      setLimit(response.limit);
      haptic('light');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'SYNTHAX-9 временно недоступен');
    } finally {
      setLoading(false);
    }
  };

  const activeModelObj = MODELS.find((m) => m.id === selectedModel) || MODELS[0];
  const dailyLimitText = remaining !== null && limit !== null
    ? `${remaining} из ${limit} запросов сегодня`
    : effectivePro
      ? 'До 10 запросов в день'
      : '2 бесплатных запроса в день';

  return (
    <div className="syn9-studio">
      <header className="syn9-header">
        <div className="syn9-brand">
          <div className="syn9-brand__mask-wrap">
            <img src={maskSrc} alt="" className="syn9-brand__mask" />
          </div>
          <div className="syn9-brand__info">
            <span className="syn9-brand__kicker">ZENOVA NEURAL ENGINE</span>
            <h2 className="syn9-brand__title">SYNTHAX-9</h2>
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

      {/* Выбор нейросети */}
      <section className="syn9-models" aria-label="Выбор модели">
        <div className="syn9-models__head">
          <span className="syn9-models__label">
            <Cpu size={13} /> Модель: <strong>{activeModelObj.name}</strong>
          </span>
          <span className={`syn9-quota ${effectivePro ? 'is-pro' : ''}`}>
            {effectivePro && <Crown size={11} />}
            {dailyLimitText}
          </span>
        </div>

        <div className="syn9-models__grid">
          {MODELS.map((m) => {
            const locked = m.proOnly && !effectivePro;
            const active = selectedModel === m.id && !locked;
            return (
              <button
                key={m.id}
                type="button"
                className={`syn9-model-card ${active ? 'is-active' : ''} ${locked ? 'is-locked' : ''}`}
                onClick={() => handleSelectModel(m)}
              >
                <div className="syn9-model-card__top">
                  <span className={`syn9-model-badge ${m.proOnly ? 'is-pro' : 'is-free'}`}>
                    {locked ? <Lock size={10} /> : m.proOnly ? <Crown size={10} /> : <Sparkles size={10} />}
                    {m.tag}
                  </span>
                </div>
                <strong className="syn9-model-card__name">{m.name}</strong>
                <span className="syn9-model-card__desc">{m.desc}</span>
              </button>
            );
          })}
        </div>

        {!effectivePro && (
          <div className="syn9-upsell">
            <div className="syn9-upsell__copy">
              <strong>Откройте Gemini 2.5 Pro и Kimi K3.1 Pro</strong>
              <span>10 запросов каждый день в тарифе ZENOVA PRO</span>
            </div>
            <button type="button" className="syn9-upsell__btn" onClick={() => navigate('/premium')}>
              PRO · 29 ⭐
            </button>
          </div>
        )}
      </section>

      {/* Область чата */}
      <section className="syn9-chat" aria-live="polite">
        {messages.length === 0 ? (
          <div className="syn9-welcome">
            <span className="syn9-welcome__icon">
              <Film size={22} />
            </span>
            <h3>Спросите SYNTHAX-9</h3>
            <p>
              Опишите настроение, любимый фильм или попросите разобрать сюжет. Работает на базе {activeModelObj.name}.
            </p>
            <div className="syn9-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="syn9-messages">
            {messages.map((message) => (
              <article key={message.id} className={`syn9-msg syn9-msg--${message.role}`}>
                <span className="syn9-msg__author">
                  {message.role === 'assistant' ? (message.modelName || 'SYNTHAX-9') : 'ВЫ'}
                </span>
                <p className="syn9-msg__text">{message.text}</p>
              </article>
            ))}
          </div>
        )}

        {loading && (
          <div className="syn9-thinking">
            <i />
            <i />
            <i />
            <span>{activeModelObj.name} формирует ответ…</span>
          </div>
        )}

        {error && (
          <div className="syn9-error" role="alert">
            <span>{error}</span>
            {!effectivePro && (
              <button type="button" onClick={() => navigate('/premium')}>
                Перейти в PRO
              </button>
            )}
          </div>
        )}
        <div ref={endRef} />
      </section>

      {/* Поле ввода */}
      <form
        className="syn9-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <label htmlFor="syn9-prompt" className="sr-only">
          Запрос к SYNTHAX-9
        </label>
        <textarea
          id="syn9-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value.slice(0, 1200))}
          placeholder="Например: мрачный детектив в духе «Настоящего детектива»…"
          rows={2}
          maxLength={1200}
          disabled={loading}
        />
        <div className="syn9-composer__bottom">
          <span>{prompt.length}/1200 · {activeModelObj.name}</span>
          <button
            type="submit"
            disabled={!prompt.trim() || loading}
            aria-label="Отправить запрос"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default SynthaxAiStudio;
