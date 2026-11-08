import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useTelegram } from '../hooks/useTelegram';
import { resolveUserAccess } from '../services/accessControl';
import { getStoredSeason } from '../services/seasons';
import './SynthaxAiStudio.css';

interface CreationItem {
  id: string;
  type: 'poster' | 'scene' | 'script';
  prompt: string;
  resultUrl?: string;
  scriptText?: string;
  format: string;
  createdAt: number;
}

const STORAGE_KEY = 'zenova_synthax_creations_v1';

const PRESET_PROMPTS = [
  'Неоновый киберпанк постер фильма, Москва 2099, голографический дождь, 8k IMAX',
  'Космическая одиссея в стиле Кристофера Нолана, гигантская черная дыра, 4k кинематография',
  'Темный нуар детектив, дождливый ночной мегаполис, контрастный неоновый свет, фотореализм',
  'Древнерусская сказка в стиле темного кибер-фэнтези, богатырь и неоновый дракон',
  'Постапокалиптический мир безумного выживания, пыльная буря на закате, кинематографичный кадр',
  'Аниме блокбастер в стиле Хаяо Миядзаки и Макото Синкая, парящий небесный замок',
];

const SHOWCASE_SAMPLES = [
  {
    title: 'CYBER-MOSCOW 2099',
    sub: 'FLUX 4K · Киберпанк Нео-Постер',
    url: 'https://image.pollinations.ai/prompt/cyberpunk%20moscow%202099%20cinematic%20movie%20poster%20neon%20rain%20holograms%20dramatic%20lighting%208k%20imax?width=768&height=1024&model=flux&nologo=true&seed=42',
  },
  {
    title: 'INTERSTELLAR CORE',
    sub: 'FLUX 4K · Кинематографичный кадр 16:9',
    url: 'https://image.pollinations.ai/prompt/interstellar%20cinematic%20movie%20still%20giant%20glowing%20black%20hole%20spaceship%20photorealistic%208k%20imax%2070mm?width=1024&height=576&model=flux&nologo=true&seed=777',
  },
  {
    title: 'GOTHAM NOIR',
    sub: 'FLUX 4K · Мрачный детективный нуар',
    url: 'https://image.pollinations.ai/prompt/dark%20noir%20detective%20movie%20poster%20rainy%20city%20street%20neon%20reflections%20cinematic%20composition%208k?width=768&height=1024&model=flux&nologo=true&seed=101',
  },
];

export const SynthaxAiStudio: React.FC = () => {
  const navigate = useNavigate();
  const { haptic, user, openLink } = useTelegram();
  const { isPremium, role, telegramUsername } = useStore();

  /* Проверка PRO статуса пользователя */
  const effectiveUser = user?.username || telegramUsername || '';
  const userAccess = resolveUserAccess(effectiveUser);
  const isPro = isPremium || userAccess.isVip || userAccess.isAdmin || role === 'admin';

  const isWinter = getStoredSeason().season.id === 'winter';
  const maskSrc = isWinter ? '/zenova-mask-mini-winter.png' : '/zenova-mask-mini.png';

  /* Состояние студии */
  const [mode, setMode] = useState<'poster' | 'scene' | 'script'>('poster');
  const [promptText, setPromptText] = useState('');
  const [aspect, setAspect] = useState<'poster' | 'wide' | 'square'>('poster');
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [currentCreation, setCurrentCreation] = useState<CreationItem | null>(null);
  const [creations, setCreations] = useState<CreationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const saveCreationsToStorage = (items: CreationItem[]) => {
    setCreations(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 20)));
    } catch {}
  };

  const handleRandomPreset = () => {
    haptic('light');
    const random = PRESET_PROMPTS[Math.floor(Math.random() * PRESET_PROMPTS.length)];
    setPromptText(random);
  };

  /* Генерация через нейросеть SYNTHAX-9 */
  const handleGenerate = async () => {
    if (!promptText.trim() || generating) return;
    if (!isPro) {
      haptic('heavy');
      navigate('/profile');
      return;
    }

    haptic('medium');
    setGenerating(true);
    setStatusMsg('SYNTHAX-9: Инициализация квантового ядра…');

    try {
      if (mode === 'script') {
        setStatusMsg('SYNTHAX-9: Составление кинематографичного синопсиса…');
        const systemPrompt = `Ты — SYNTHAX-9, элитный голливудский сценарист и креативный директор ZENOVA. Напиши захватывающий кино-синопсис, концепцию блокбастера или описание сцены по запросу на русском языке. Ответ должен быть структурированным, стильным, с логлайном, героями и визуальным стилем. Запрос: ${promptText}`;

        const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(systemPrompt)}?model=openai`);
        if (!res.ok) throw new Error('Сбой нейросети');
        const text = await res.text();

        const newItem: CreationItem = {
          id: `synthax-${Date.now()}`,
          type: 'script',
          prompt: promptText,
          scriptText: text,
          format: 'Текст / Сценарий',
          createdAt: Date.now(),
        };

        setCurrentCreation(newItem);
        saveCreationsToStorage([newItem, ...creations]);
        haptic('heavy');
      } else {
        // Режим постера или живой сцены
        setStatusMsg('SYNTHAX-9: Синтез 4K-кадра через FLUX Neural Core…');

        let width = 768;
        let height = 1024;
        let formatLabel = 'Постер 3:4';

        if (aspect === 'wide' || mode === 'scene') {
          width = 1024;
          height = 576;
          formatLabel = 'Кинокадр 16:9';
        } else if (aspect === 'square') {
          width = 1024;
          height = 1024;
          formatLabel = 'Квадрат 1:1';
        }

        const cinemaEnhancers = mode === 'scene'
          ? 'cinematic movie still, photorealistic 8k, dramatic cinematic lighting, IMAX 70mm, highly detailed, masterpieces, film composition'
          : 'cinematic movie poster, title art, high resolution, 8k, photorealistic, volumetric neon lighting, award winning movie design';

        const finalQuery = `${promptText}, ${cinemaEnhancers}`;
        const seed = Math.floor(Math.random() * 9999999);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalQuery)}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`;

        // Предзагрузка изображения, чтобы не мигало
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve; // если ошибка, все равно покажем URL
          img.src = imageUrl;
          // Таймаут безопасности 15 сек
          setTimeout(resolve, 15000);
        });

        const newItem: CreationItem = {
          id: `synthax-${Date.now()}`,
          type: mode,
          prompt: promptText,
          resultUrl: imageUrl,
          format: formatLabel,
          createdAt: Date.now(),
        };

        setCurrentCreation(newItem);
        saveCreationsToStorage([newItem, ...creations]);
        haptic('heavy');
      }
    } catch {
      showToast('Ошибка генерации, попробуйте еще раз');
      haptic('light');
    } finally {
      setGenerating(false);
      setStatusMsg('');
    }
  };

  const copyResult = (textOrUrl: string) => {
    haptic('light');
    try {
      navigator.clipboard.writeText(textOrUrl);
      showToast('Ссылка скопирована в буфер обмена 📋');
    } catch {
      showToast('Скопировано');
    }
  };

  const openFull = (url: string) => {
    haptic('light');
    if (openLink) {
      openLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="syn-studio">
      {/* ── Шапка студии SYNTHAX-9 ── */}
      <header className="syn-header">
        <div className="syn-brand">
          <div className="syn-brand__mask-wrap">
            <img src={maskSrc} alt="SYNTHAX-9" className="syn-brand__mask" />
            <span className="syn-brand__mask-pulse" />
          </div>
          <div className="syn-brand__info">
            <div className="syn-brand__kicker-row">
              <span className="syn-brand__kicker">ZENOVA NEURAL CORE</span>
              <span className="syn-brand__badge-pro">PRO ONLY</span>
            </div>
            <h2 className="syn-brand__title">SYNTHAX-9</h2>
          </div>
        </div>

        <div className="syn-status-chip">
          <span className={`syn-status-dot ${isPro ? 'is-active' : 'is-locked'}`} />
          <span className="syn-status-text">{isPro ? 'ЯДРО АКТИВНО' : 'PRO ТРЕБУЕТСЯ'}</span>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
         БЛОК 1: ДЛЯ НЕ-PRO КЛИЕНТОВ (ЗАБЛОКИРОВАННАЯ КВАНТОВАЯ КАМЕРА)
         ════════════════════════════════════════════════════════════════════ */}
      {!isPro ? (
        <section className="syn-locked-chamber">
          <div className="syn-locked-card">
            <div className="syn-locked-icon-wrap">
              <span className="syn-locked-icon">🔒</span>
              <span className="syn-locked-aura" />
            </div>

            <span className="syn-locked-pill">ЭКСКЛЮЗИВ ZENOVA PRO</span>
            <h3 className="syn-locked-title">Нейростудия SYNTHAX-9</h3>
            <p className="syn-locked-desc">
              Собственный кинематографичный ИИ нового поколения. Создавайте 4K-постеры несуществующих фильмов, живые сцены и оригинальные киносценарии в один клик.
            </p>

            {/* Витрина образцов нейросети */}
            <div className="syn-samples-header">
              <span className="syn-samples-spark">✦</span>
              <span>Сгенерировано SYNTHAX-9</span>
            </div>

            <div className="syn-samples-carousel">
              {SHOWCASE_SAMPLES.map((s) => (
                <div key={s.title} className="syn-sample-card">
                  <img src={s.url} alt={s.title} loading="lazy" />
                  <div className="syn-sample-overlay">
                    <strong>{s.title}</strong>
                    <small>{s.sub}</small>
                  </div>
                </div>
              ))}
            </div>

            <ul className="syn-features-list">
              <li>
                <span className="syn-feat-check">✓</span>
                <span>Неограниченная генерация 4K-постеров на базе FLUX.1</span>
              </li>
              <li>
                <span className="syn-feat-check">✓</span>
                <span>Синтез живых кинокадров и концепт-артов в 16:9</span>
              </li>
              <li>
                <span className="syn-feat-check">✓</span>
                <span>Кино-Сценарист: создание сюжетов и логлайнов без лимитов</span>
              </li>
              <li>
                <span className="syn-feat-check">✓</span>
                <span>Скачивание без водяных знаков в оригинальном качестве</span>
              </li>
            </ul>

            <button
              type="button"
              className="syn-unlock-btn"
              onClick={() => {
                haptic('heavy');
                navigate('/profile');
              }}
            >
              <span className="syn-unlock-spark">✦</span>
              <span>Активировать ZENOVA PRO</span>
            </button>
          </div>
        </section>
      ) : (
        /* ════════════════════════════════════════════════════════════════════
           БЛОК 2: ДЛЯ PRO КЛИЕНТОВ (ПОЛНОЦЕННАЯ РАБОЧАЯ НЕЙРОСТУДИЯ)
           ════════════════════════════════════════════════════════════════════ */
        <section className="syn-workspace">
          {/* Переключатель режимов */}
          <div className="syn-modes">
            <button
              type="button"
              className={`syn-mode-btn ${mode === 'poster' ? 'is-active' : ''}`}
              onClick={() => {
                haptic('light');
                setMode('poster');
                setAspect('poster');
              }}
            >
              <span>📸</span>
              <span>4K Постер</span>
            </button>

            <button
              type="button"
              className={`syn-mode-btn ${mode === 'scene' ? 'is-active' : ''}`}
              onClick={() => {
                haptic('light');
                setMode('scene');
                setAspect('wide');
              }}
            >
              <span>🎬</span>
              <span>Кино-Сцена</span>
            </button>

            <button
              type="button"
              className={`syn-mode-btn ${mode === 'script' ? 'is-active' : ''}`}
              onClick={() => {
                haptic('light');
                setMode('script');
              }}
            >
              <span>📜</span>
              <span>Сценарист</span>
            </button>
          </div>

          {/* Быстрые кинематографичные пресеты */}
          <div className="syn-presets-bar">
            <span className="syn-presets-title">Быстрые идеи:</span>
            <div className="syn-presets-chips">
              {PRESET_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  className="syn-chip"
                  onClick={() => {
                    haptic('light');
                    setPromptText(p);
                  }}
                >
                  {p.split(',')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Поле ввода запроса для нейросети */}
          <div className="syn-input-card">
            <div className="syn-input-top">
              <span className="syn-input-label">
                {mode === 'script' ? 'Опишите тему фильма или сцену' : 'Что синтезировать в кадре'}
              </span>
              <button type="button" className="syn-random-btn" onClick={handleRandomPreset}>
                <span>🎲</span> Случайная идея
              </button>
            </div>

            <textarea
              className="syn-textarea"
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={
                mode === 'script'
                  ? 'Например: Закрученный триллер про хакера, который случайно взломал разум ИИ'
                  : 'Например: Киберпанк самурай под неоновым дождем в Токио 2099, постер 8k'
              }
            />

            {/* Выбор пропорций (для фото и сцен) */}
            {mode !== 'script' && (
              <div className="syn-aspect-row">
                <span className="syn-aspect-label">Формат:</span>
                <div className="syn-aspect-btns">
                  <button
                    type="button"
                    className={`syn-aspect-btn ${aspect === 'poster' ? 'is-active' : ''}`}
                    onClick={() => { haptic('light'); setAspect('poster'); }}
                  >
                    Постер 3:4
                  </button>
                  <button
                    type="button"
                    className={`syn-aspect-btn ${aspect === 'wide' ? 'is-active' : ''}`}
                    onClick={() => { haptic('light'); setAspect('wide'); }}
                  >
                    Киноэкран 16:9
                  </button>
                  <button
                    type="button"
                    className={`syn-aspect-btn ${aspect === 'square' ? 'is-active' : ''}`}
                    onClick={() => { haptic('light'); setAspect('square'); }}
                  >
                    Квадрат 1:1
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              className="syn-generate-btn"
              disabled={!promptText.trim() || generating}
              onClick={handleGenerate}
            >
              {generating ? (
                <>
                  <span className="syn-spinner" />
                  <span>{statusMsg || 'Синтез кадра…'}</span>
                </>
              ) : (
                <>
                  <span className="syn-btn-spark">⚡</span>
                  <span>{mode === 'script' ? 'Написать сценарий' : 'Синтезировать в 4K'}</span>
                </>
              )}
            </button>
          </div>

          {/* Результат последней генерации */}
          {currentCreation && (
            <div className="syn-result-card">
              <div className="syn-result-header">
                <div className="syn-result-badge">
                  <span className="syn-result-dot" />
                  <span>СИНТЕЗИРОВАНО SYNTHAX-9</span>
                </div>
                <span className="syn-result-format">{currentCreation.format}</span>
              </div>

              {currentCreation.resultUrl && (
                <div className="syn-result-media">
                  <img
                    src={currentCreation.resultUrl}
                    alt={currentCreation.prompt}
                    className="syn-result-img"
                    onClick={() => openFull(currentCreation.resultUrl!)}
                  />
                  <div className="syn-result-watermark">SYNTHAX-9 · PRO CORE</div>
                </div>
              )}

              {currentCreation.scriptText && (
                <div className="syn-result-script">
                  <pre>{currentCreation.scriptText}</pre>
                </div>
              )}

              <p className="syn-result-prompt">
                <strong>Промпт:</strong> {currentCreation.prompt}
              </p>

              <div className="syn-result-actions">
                {currentCreation.resultUrl ? (
                  <>
                    <button
                      type="button"
                      className="syn-act-btn syn-act-btn--primary"
                      onClick={() => openFull(currentCreation.resultUrl!)}
                    >
                      <span>🔍</span> Открыть в 4K
                    </button>
                    <button
                      type="button"
                      className="syn-act-btn"
                      onClick={() => copyResult(currentCreation.resultUrl!)}
                    >
                      <span>🔗</span> Копировать ссылку
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="syn-act-btn syn-act-btn--primary"
                    onClick={() => copyResult(currentCreation.scriptText || '')}
                  >
                    <span>📋</span> Копировать текст
                  </button>
                )}
              </div>
            </div>
          )}

          {/* История недавних созданий */}
          {creations.length > 0 && (
            <div className="syn-history-section">
              <h4 className="syn-history-title">
                <span>📁</span> Галерея ваших генераций ({creations.length})
              </h4>
              <div className="syn-history-grid">
                {creations.map((item) => (
                  <div
                    key={item.id}
                    className="syn-history-item"
                    onClick={() => {
                      haptic('light');
                      setCurrentCreation(item);
                      window.scrollTo({ top: 380, behavior: 'smooth' });
                    }}
                  >
                    {item.resultUrl ? (
                      <img src={item.resultUrl} alt={item.prompt} />
                    ) : (
                      <div className="syn-history-text-preview">
                        <span>📜</span>
                        <small>{item.prompt.slice(0, 40)}…</small>
                      </div>
                    )}
                    <div className="syn-history-overlay">
                      <span>{item.format}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Всплывающее уведомление */}
      {toast && <div className="syn-toast">{toast}</div>}
    </div>
  );
};
