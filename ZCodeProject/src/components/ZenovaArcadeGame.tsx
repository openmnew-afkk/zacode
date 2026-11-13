import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChevronLeft,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Crown,
  Zap,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import { triggerSeasonalBurst } from './SeasonFx';
import './ZenovaArcadeGame.css';

interface ZenovaArcadeGameProps {
  onBack: () => void;
  onWinBonus?: () => void;
}

interface Pillar {
  x: number;
  top: number;
  bottom: number;
  passed: boolean;
}

interface CollectibleStar {
  x: number;
  y: number;
  rot: number;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

/* ═══════════════════════════════════════════════════════════════════
 *  🎵 Синтезатор звуковых эффектов Web Audio API (0 зависимостей)
 * ═══════════════════════════════════════════════════════════════════ */
class ArcadeSoundSynth {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  constructor() {
    try {
      this.muted = localStorage.getItem('zen_arcade_sound') === '0';
    } catch {
      this.muted = false;
    }
  }

  private init() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playJump() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(390, now + 0.11);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch {}
  }

  playScore() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.05);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch {}
  }

  playCoin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [587, 880, 1174].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const start = now + idx * 0.04;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.12);
      });
    } catch {}
  }

  playHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  playWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const start = now + i * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.24, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch {}
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('zen_arcade_sound', this.muted ? '0' : '1');
    } catch {}
    return this.muted;
  }
}

const soundSynth = new ArcadeSoundSynth();

export const ZenovaArcadeGame: React.FC<ZenovaArcadeGameProps> = ({
  onBack,
  onWinBonus,
}) => {
  const { haptic } = useTelegram();
  const activatePremiumDays = useStore((s) => s.activatePremiumDays);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isMuted, setIsMuted] = useState(() => soundSynth.muted);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('zen_arcade_best') || 0);
    } catch {
      return 0;
    }
  });

  const [wonBonus, setWonBonus] = useState(() => {
    try {
      return localStorage.getItem('zen_arcade_won_bonus') === '1';
    } catch {
      return false;
    }
  });

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2400);
  }, []);

  // Ссылки для доступа из игрового цикла
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  const scoreRef = useRef(score);
  scoreRef.current = score;

  const livesRef = useRef(lives);
  livesRef.current = lives;

  const bestScoreRef = useRef(bestScore);
  bestScoreRef.current = bestScore;

  const wonBonusRef = useRef(wonBonus);
  wonBonusRef.current = wonBonus;

  const onWinBonusRef = useRef(onWinBonus);
  onWinBonusRef.current = onWinBonus;

  // Игровые сущности
  const gameEntitiesRef = useRef<{
    playerY: number;
    playerVy: number;
    pillars: Pillar[];
    stars: CollectibleStar[];
    particles: Particle[];
    floatingTexts: FloatingText[];
    bgStars: Array<{ x: number; y: number; s: number; a: number; v: number }>;
    combo: number;
    invulnerable: number;
    screenShake: number;
    frame: number;
  }>({
    playerY: 200,
    playerVy: 0,
    pillars: [],
    stars: [],
    particles: [],
    floatingTexts: [],
    bgStars: [],
    combo: 0,
    invulnerable: 0,
    screenShake: 0,
    frame: 0,
  });

  // Переключение звука
  const toggleSound = () => {
    haptic('light');
    const next = soundSynth.toggleMute();
    setIsMuted(next);
    showToast(next ? 'Звук выключен 🔇' : 'Звук включен 🔊');
  };

  // Переключение паузы
  const togglePause = () => {
    haptic('light');
    if (gameState === 'playing') {
      setGameState('paused');
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  };

  // Действие: прыжок
  const triggerJump = useCallback(() => {
    if (stateRef.current === 'paused') return;

    if (stateRef.current === 'idle' || stateRef.current === 'gameover') {
      // Старт новой игры
      const ent = gameEntitiesRef.current;
      ent.playerY = 190;
      ent.playerVy = -6.5;
      ent.pillars = [];
      ent.stars = [];
      ent.particles = [];
      ent.floatingTexts = [];
      ent.combo = 0;
      ent.invulnerable = 0;
      ent.screenShake = 0;
      ent.frame = 0;

      setScore(0);
      setLives(3);
      setGameState('playing');

      soundSynth.playJump();
      haptic('light');
      return;
    }

    // В процессе игры: прыжок
    gameEntitiesRef.current.playerVy = -6.5;
    soundSynth.playJump();
    haptic('light');

    // Эмиссия частиц пламени из турбин при прыжке
    const ent = gameEntitiesRef.current;
    for (let i = 0; i < 6; i++) {
      ent.particles.push({
        x: 62,
        y: ent.playerY + (Math.random() * 8 - 4),
        vx: -(Math.random() * 3.5 + 2.5),
        vy: Math.random() * 2 - 1,
        color: i % 2 === 0 ? '#38bdf8' : '#f59e0b',
        size: Math.random() * 3.5 + 1.5,
        life: 0,
        maxLife: Math.random() * 12 + 8,
      });
    }
  }, [haptic]);

  // Поделиться рекордом
  const handleShare = () => {
    haptic('medium');
    const text = `🚀 Мой рекорд в Zenova Star Runner: ${scoreRef.current} очков! Залетай в игру, набери 25 и забери 3 дня ZENOVA PRO!`;
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        showToast('Текст рекорда скопирован в буфер! Отправь друзьям');
      } else {
        showToast(`Твой счёт: ${scoreRef.current}!`);
      }
    } catch {
      showToast(`Твой счёт: ${scoreRef.current}!`);
    }
  };

  // ══════════════ ИНИЦИАЛИЗАЦИЯ И ИГРОВОЙ ЦИКЛ 60-120 FPS ══════════════
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Инициализация фоновых звезд
    const ent = gameEntitiesRef.current;
    if (ent.bgStars.length === 0) {
      for (let i = 0; i < 45; i++) {
        ent.bgStars.push({
          x: Math.random() * 360,
          y: Math.random() * 420,
          s: Math.random() * 2.2 + 0.6,
          a: Math.random() * 0.7 + 0.3,
          v: Math.random() * 0.7 + 0.3,
        });
      }
    }

    let animId = 0;
    const gravity = 0.38;
    const playerRadius = 14;

    // Retina масштабирование
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = 360 * dpr;
      canvas.height = 420 * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();

    // Генерация неоновых колонн и звезд
    const spawnPillar = () => {
      const gap = Math.max(115, 130 - Math.min(scoreRef.current * 0.4, 20));
      const minTop = 45;
      const maxTop = 420 - gap - 65;
      const top = Math.floor(Math.random() * (maxTop - minTop) + minTop);
      const bottom = top + gap;

      ent.pillars.push({
        x: 375,
        top,
        bottom,
        passed: false,
      });

      // С вероятностью 60% спавним коллекционную звезду в коридоре
      if (Math.random() < 0.6) {
        ent.stars.push({
          x: 375 + 20,
          y: top + gap / 2,
          rot: 0,
          collected: false,
        });
      }
    };

    const awardPoints = (pts: number) => {
      const prev = scoreRef.current;
      const next = prev + pts;
      scoreRef.current = next;
      setScore(next);

      if (next > bestScoreRef.current) {
        setBestScore(next);
        bestScoreRef.current = next;
        try {
          localStorage.setItem('zen_arcade_best', String(next));
        } catch {}
      }

      if (prev < 25 && next >= 25 && !wonBonusRef.current) {
        wonBonusRef.current = true;
        setWonBonus(true);
        try {
          localStorage.setItem('zen_arcade_won_bonus', '1');
        } catch {}
        triggerSeasonalBurst(45);
        soundSynth.playWin();
        haptic('heavy');
        onWinBonusRef.current?.();
        ent.floatingTexts.push({
          x: 180,
          y: 120,
          text: '3 ДНЯ PRO',
          color: '#fbbf24',
          life: 0,
          maxLife: 75,
        });
      }
    };

    const burst = (x: number, y: number, color: string, count: number, speed: number) => {
      for (let k = 0; k < count; k++) {
        ent.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * speed,
          vy: (Math.random() - 0.5) * speed,
          color,
          size: Math.random() * 4 + 2,
          life: 0,
          maxLife: 22,
        });
      }
    };

    const loseLife = (x: number, y: number) => {
      if (ent.invulnerable > 0 || stateRef.current !== 'playing') return;
      if (livesRef.current > 1) {
        const remainingLives = livesRef.current - 1;
        setLives(remainingLives);
        livesRef.current = remainingLives;
        ent.invulnerable = 90;
        ent.screenShake = 10;
        ent.combo = 0;
        soundSynth.playHit();
        haptic('heavy');
        burst(x, y, '#ef4444', 16, 7);
        return;
      }
      setLives(0);
      livesRef.current = 0;
      setGameState('gameover');
      soundSynth.playHit();
      haptic('heavy');
      burst(x, y, '#fbbf24', 12, 9);
      burst(x, y, '#38bdf8', 12, 9);
      burst(x, y, '#ef4444', 12, 9);
    };

    let lastTs = 0;
    let step = 1;
    let spawnTravel = 0;
    let exhaustAcc = 0;

    // Главный цикл отрисовки. step = 1 на 60 Гц, чтобы на 120 Гц игра не ускорялась.
    const render = (ts: number) => {
      const w = 360;
      const h = 420;
      if (!lastTs) lastTs = ts;
      step = Math.min(2, (ts - lastTs) / 16.67);
      lastTs = ts;

      ent.frame++;

      // Тряска экрана при попадании
      let offsetX = 0;
      let offsetY = 0;
      if (ent.screenShake > 0) {
        ent.screenShake = Math.max(0, ent.screenShake - step);
        offsetX = (Math.random() - 0.5) * 6;
        offsetY = (Math.random() - 0.5) * 6;
      }

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.clearRect(0, 0, w, h);

      // ── ФОН: Глубокий ночной космос ──
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#060711');
      bgGrad.addColorStop(0.5, '#0b0c1e');
      bgGrad.addColorStop(1, '#131128');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Небула / космическое свечение
      const nebGrad = ctx.createRadialGradient(w * 0.7, h * 0.3, 10, w * 0.7, h * 0.3, 180);
      nebGrad.addColorStop(0, 'rgba(99, 102, 241, 0.14)');
      nebGrad.addColorStop(0.6, 'rgba(168, 85, 247, 0.05)');
      nebGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = nebGrad;
      ctx.fillRect(0, 0, w, h);

      // Параллакс звездного поля
      ent.bgStars.forEach((st) => {
        if (stateRef.current === 'playing') {
          st.x -= st.v * step;
          if (st.x < 0) {
            st.x = w;
            st.y = Math.random() * h;
          }
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${st.a})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.s, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── ФИЗИКА И ОБНОВЛЕНИЕ ПРИ ИГРЕ ──
      if (stateRef.current === 'playing') {
        ent.playerVy += gravity;
        ent.playerY += ent.playerVy;

        if (ent.invulnerable > 0) ent.invulnerable--;

        // Постепенный разгон скорости от очков
        const gameSpeed = 2.3 + Math.min(scoreRef.current * 0.03, 1.2);
        const spawnInterval = Math.max(76, Math.floor(92 - Math.min(scoreRef.current * 0.4, 20)));

        if (ent.frame % spawnInterval === 0) {
          spawnPillar();
        }

        // Движение и отрисовка колонн
        for (let i = ent.pillars.length - 1; i >= 0; i--) {
          const p = ent.pillars[i];
          p.x -= gameSpeed;

          // Проверка пролёта колонны
          const playerX = 72;
          if (!p.passed && p.x + 42 < playerX) {
            p.passed = true;
            ent.combo++;
            const newScore = scoreRef.current + 1;
            setScore(newScore);
            scoreRef.current = newScore;

            soundSynth.playScore();
            haptic('light');

            // Рекорд
            if (newScore > bestScoreRef.current) {
              setBestScore(newScore);
              bestScoreRef.current = newScore;
              try {
                localStorage.setItem('zen_arcade_best', String(newScore));
              } catch {}
            }

            // Награда за 25 очков
            if (newScore === 25 && !wonBonusRef.current) {
              wonBonusRef.current = true;
              setWonBonus(true);
              try {
                localStorage.setItem('zen_arcade_won_bonus', '1');
              } catch {}
              activatePremiumDays(3);
              triggerSeasonalBurst(45);
              soundSynth.playWin();
              haptic('heavy');
              onWinBonus?.();

              ent.floatingTexts.push({
                x: w / 2,
                y: 120,
                text: '👑 3 ДНЯ PRO АКТИВИРОВАНО!',
                color: '#fbbf24',
                life: 0,
                maxLife: 75,
              });
            }

            // Всплывающий комбо-текст
            if (ent.combo >= 3) {
              ent.floatingTexts.push({
                x: playerX + 18,
                y: ent.playerY - 14,
                text: `COMBO x${ent.combo}! 🔥`,
                color: '#38bdf8',
                life: 0,
                maxLife: 32,
              });
            }
          }

          // Коллизия с колоннами (с учетом жизней и неуязвимости)
          if (ent.invulnerable === 0) {
            const hitMargin = 3;
            if (playerX + playerRadius - hitMargin > p.x && playerX - playerRadius + hitMargin < p.x + 42) {
              if (ent.playerY - playerRadius + hitMargin < p.top || ent.playerY + playerRadius - hitMargin > p.bottom) {
                // Попадание!
                if (livesRef.current > 1) {
                  const remainingLives = livesRef.current - 1;
                  setLives(remainingLives);
                  livesRef.current = remainingLives;

                  ent.invulnerable = 80;
                  ent.screenShake = 10;
                  ent.combo = 0;

                  soundSynth.playHit();
                  haptic('heavy');

                  // Искры попадания
                  for (let k = 0; k < 15; k++) {
                    ent.particles.push({
                      x: playerX,
                      y: ent.playerY,
                      vx: (Math.random() - 0.5) * 7,
                      vy: (Math.random() - 0.5) * 7,
                      color: '#ef4444',
                      size: Math.random() * 4 + 2,
                      life: 0,
                      maxLife: 20,
                    });
                  }
                } else {
                  // Game Over
                  setLives(0);
                  livesRef.current = 0;
                  setGameState('gameover');
                  soundSynth.playHit();
                  haptic('heavy');

                  // Финальный взрыв корабля
                  for (let k = 0; k < 35; k++) {
                    ent.particles.push({
                      x: playerX,
                      y: ent.playerY,
                      vx: (Math.random() - 0.5) * 9,
                      vy: (Math.random() - 0.5) * 9,
                      color: k % 3 === 0 ? '#fbbf24' : k % 3 === 1 ? '#38bdf8' : '#ef4444',
                      size: Math.random() * 5 + 2,
                      life: 0,
                      maxLife: 30,
                    });
                  }
                }
              }
            }
          }

          // Удаление старых колонн
          if (p.x < -60) {
            ent.pillars.splice(i, 1);
          }
        }

        // Коллекционные звезды
        for (let i = ent.stars.length - 1; i >= 0; i--) {
          const s = ent.stars[i];
          s.x -= gameSpeed;
          s.rot += 0.05;

          const playerX = 72;
          const dist = Math.hypot(playerX - s.x, ent.playerY - s.y);
          if (!s.collected && dist < playerRadius + 15) {
            s.collected = true;
            const newScore = scoreRef.current + 3;
            setScore(newScore);
            scoreRef.current = newScore;

            soundSynth.playCoin();
            haptic('medium');

            ent.floatingTexts.push({
              x: s.x,
              y: s.y - 10,
              text: '+3 ⭐',
              color: '#fbbf24',
              life: 0,
              maxLife: 30,
            });

            // Золотые искры
            for (let k = 0; k < 14; k++) {
              ent.particles.push({
                x: s.x,
                y: s.y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                color: '#ffd56b',
                size: Math.random() * 3 + 1.5,
                life: 0,
                maxLife: 22,
              });
            }
          }

          if (s.x < -40 || s.collected) {
            ent.stars.splice(i, 1);
          }
        }

        // Коллизия с границами холста
        if (ent.playerY + playerRadius > h - 8 || ent.playerY - playerRadius < 4) {
          setLives(0);
          livesRef.current = 0;
          setGameState('gameover');
          soundSynth.playHit();
          haptic('heavy');
        }

        // Непрерывный шлейф выхлопа турбин
        if (ent.frame % 3 === 0) {
          ent.particles.push({
            x: 58,
            y: ent.playerY + (Math.random() * 4 - 2),
            vx: -(Math.random() * 2.5 + 1.5),
            vy: (Math.random() - 0.5) * 1.2,
            color: '#38bdf8',
            size: Math.random() * 2.5 + 1,
            life: 0,
            maxLife: 14,
          });
        }
      }

      // ── ОТРИСОВКА НЕОНОВЫХ КОЛОНН ──
      ent.pillars.forEach((p) => {
        // Верхняя колонна
        const topGrad = ctx.createLinearGradient(p.x, 0, p.x + 42, 0);
        topGrad.addColorStop(0, '#3b82f6');
        topGrad.addColorStop(0.5, '#8b5cf6');
        topGrad.addColorStop(1, '#ec4899');
        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.roundRect(p.x, 0, 42, p.top, [0, 0, 10, 10]);
        ctx.fill();

        // Световая линия по центру
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x + 21, 0);
        ctx.lineTo(p.x + 21, p.top - 6);
        ctx.stroke();

        // Нижняя колонна
        const btmGrad = ctx.createLinearGradient(p.x, 0, p.x + 42, 0);
        btmGrad.addColorStop(0, '#ec4899');
        btmGrad.addColorStop(0.5, '#8b5cf6');
        btmGrad.addColorStop(1, '#3b82f6');
        ctx.fillStyle = btmGrad;
        ctx.beginPath();
        ctx.roundRect(p.x, p.bottom, 42, h - p.bottom, [10, 10, 0, 0]);
        ctx.fill();

        // Световая линия нижней колонны
        ctx.beginPath();
        ctx.moveTo(p.x + 21, p.bottom + 6);
        ctx.lineTo(p.x + 21, h);
        ctx.stroke();

        // Неоновые маячки опасности
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(p.x + 21, p.top - 5, 3.5, 0, Math.PI * 2);
        ctx.arc(p.x + 21, p.bottom + 5, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── ОТРИСОВКА КОЛЛЕКЦИОННЫХ ЗВЕЗД ──
      ent.stars.forEach((s) => {
        if (s.collected) return;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);

        // Ореол
        ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        // Четырёхконечная звезда
        ctx.fillStyle = '#ffd56b';
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.lineTo(Math.cos((i * Math.PI) / 2) * 11, Math.sin((i * Math.PI) / 2) * 11);
          ctx.lineTo(Math.cos((i * Math.PI) / 2 + Math.PI / 4) * 4.5, Math.sin((i * Math.PI) / 2 + Math.PI / 4) * 4.5);
        }
        ctx.closePath();
        ctx.fill();

        // Центральная белая искра
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // ── ОТРИСОВКА ЧАСТИЦ ──
      for (let i = ent.particles.length - 1; i >= 0; i--) {
        const pt = ent.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;

        const alpha = 1 - pt.life / pt.maxLife;
        if (alpha <= 0) {
          ent.particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ── ОТРИСОВКА ИГРОКА (КИБЕР-ШАТТЛ ZENOVA) ──
      ctx.save();
      const playerX = 72;
      ctx.translate(playerX, ent.playerY);

      // Угол наклона в зависимости от скорости падения/прыжка
      const tilt = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, ent.playerVy * 0.08));
      ctx.rotate(tilt);

      // Мерцание при неуязвимости
      if (ent.invulnerable > 0 && Math.floor(ent.invulnerable / 4) % 2 === 0) {
        ctx.globalAlpha = 0.35;
      }

      // Защитный энергокупол при неуязвимости
      if (ent.invulnerable > 0) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, playerRadius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Корпус шаттла (аэродинамичный футуристичный дрон)
      const hullGrad = ctx.createLinearGradient(-14, 0, 16, 0);
      hullGrad.addColorStop(0, '#1e293b');
      hullGrad.addColorStop(0.4, '#38bdf8');
      hullGrad.addColorStop(1, '#ffffff');

      ctx.fillStyle = hullGrad;
      ctx.beginPath();
      ctx.moveTo(16, 0); // нос
      ctx.lineTo(-6, -11); // верхнее крыло
      ctx.lineTo(-14, -7);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-14, 7);
      ctx.lineTo(-6, 11); // нижнее крыло
      ctx.closePath();
      ctx.fill();

      // Неоновая окантовка крыльев
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Фонарь кабины (неоновый визор)
      ctx.fillStyle = '#67e8f9';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(3, 0, 6, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Пламя турбин двигателя
      const flameLength = Math.max(8, 12 - ent.playerVy * 1.5) + Math.random() * 4;
      const flameGrad = ctx.createLinearGradient(-14, 0, -14 - flameLength, 0);
      flameGrad.addColorStop(0, '#ffffff');
      flameGrad.addColorStop(0.3, '#38bdf8');
      flameGrad.addColorStop(0.7, '#f97316');
      flameGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(-12, -4);
      ctx.lineTo(-14 - flameLength, 0);
      ctx.lineTo(-12, 4);
      ctx.closePath();
      ctx.fill();

      // Золотая корона на шаттле при выигрыше PRO
      if (wonBonusRef.current) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-2, -13);
        ctx.lineTo(2, -18);
        ctx.lineTo(6, -13);
        ctx.lineTo(10, -18);
        ctx.lineTo(14, -13);
        ctx.lineTo(12, -9);
        ctx.lineTo(0, -9);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();

      // ── ВСПЛЫВАЮЩИЕ ТЕКСТЫ (+1, +3, COMBO) ──
      for (let i = ent.floatingTexts.length - 1; i >= 0; i--) {
        const ft = ent.floatingTexts[i];
        ft.y -= 1;
        ft.life++;

        const alpha = 1 - ft.life / ft.maxLife;
        if (alpha <= 0) {
          ent.floatingTexts.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // ── ИНДИКАТОР ТЕКУЩЕГО СЧЕТА В ИГРЕ ──
      if (stateRef.current === 'playing') {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 8;
        ctx.fillText(String(scoreRef.current), w / 2, 42);
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // События ввода на холсте
    const handlePointerDown = (e: Event) => {
      e.preventDefault();
      triggerJump();
    };

    canvas.addEventListener('mousedown', handlePointerDown);
    canvas.addEventListener('touchstart', handlePointerDown, { passive: false });

    // Клавиатура (Пробел / Стрелка вверх)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        triggerJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('mousedown', handlePointerDown);
      canvas.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [triggerJump]);

  // Расчет прогресса к цели (25 очков)
  const goalProgress = Math.min(100, Math.round((score / 25) * 100));

  // Определение ранга за раунд
  const getRoundRank = (sc: number) => {
    if (sc >= 50) return { title: 'Легенда Кибер-Космоса 💎', badge: 'DIAMOND' };
    if (sc >= 25) return { title: 'Повелитель ZENOVA 👑', badge: 'PRO WINNER' };
    if (sc >= 12) return { title: 'Мастер Кинозала 🥈', badge: 'SILVER' };
    return { title: 'Киноман-Стажёр 🥉', badge: 'BRONZE' };
  };

  const rankInfo = getRoundRank(score);

  return (
    <div className="zen-arcade-wrap" ref={containerRef}>
      {/* ── Верхний бар ── */}
      <header className="zen-arcade-topbar">
        <button type="button" className="zen-arcade-back-btn" onClick={onBack}>
          <ChevronLeft size={17} />
          <span>Назад</span>
        </button>

        <div className="zen-arcade-top-actions">
          <button
            type="button"
            className={`zen-arcade-icon-btn ${!isMuted ? 'is-active' : ''}`}
            onClick={toggleSound}
            aria-label="Звук"
          >
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>

          {gameState === 'playing' || gameState === 'paused' ? (
            <button
              type="button"
              className="zen-arcade-icon-btn"
              onClick={togglePause}
              aria-label="Пауза"
            >
              {gameState === 'paused' ? <Play size={17} /> : <Pause size={17} />}
            </button>
          ) : null}
        </div>
      </header>

      {/* ── HUD панель ── */}
      <div className="zen-arcade-hud">
        <div className="zen-arcade-hud-card">
          <span className="zen-arcade-hud-card__lbl">Счёт</span>
          <strong className="zen-arcade-hud-card__val text-cyan">{score}</strong>
        </div>

        <div className="zen-arcade-hud-card">
          <span className="zen-arcade-hud-card__lbl">Рекорд</span>
          <strong className="zen-arcade-hud-card__val text-gold">{bestScore}</strong>
        </div>

        <div className="zen-arcade-hud-card">
          <span className="zen-arcade-hud-card__lbl">Жизни</span>
          <div className="zen-arcade-lives">
            {[1, 2, 3].map((heartIdx) => (
              <span
                key={heartIdx}
                className={`zen-arcade-heart ${heartIdx > lives ? 'lost' : ''}`}
              >
                ❤️
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Полоса цели PRO (25 очков) ── */}
      <div className="zen-arcade-goal-strip">
        <div className="zen-arcade-goal-info">
          <span className="zen-arcade-goal-title">
            <Crown size={14} />
            <span>ЦЕЛЬ: 25 = 3 ДНЯ PRO</span>
          </span>
          <span className="zen-arcade-goal-status">
            {wonBonus ? '✓ Получено!' : `${score} / 25`}
          </span>
        </div>
        <div className="zen-arcade-goal-bar">
          <div className="zen-arcade-goal-fill" style={{ width: `${goalProgress}%` }} />
        </div>
      </div>

      {/* ── Игровой холст с оверлеями ── */}
      <div className="zen-arcade-canvas-box">
        <canvas ref={canvasRef} className="zen-arcade-canvas" />

        {/* ── Оверлей: Стартовое состояние ── */}
        {gameState === 'idle' && (
          <div className="zen-arcade-overlay">
            <span className="zen-arcade-badge zen-arcade-badge--gold">
              <Sparkles size={11} />
              <span>ZENOVA ARCADE 60 FPS</span>
            </span>
            <h2 className="zen-arcade-overlay-title">Star Runner</h2>
            <p className="zen-arcade-overlay-desc">
              Управляйте кибер-шаттлом, облетайте неоновые башни и собирайте звёзды ✦
            </p>

            <div className="zen-arcade-stats-panel">
              <div className="zen-arcade-stat-box">
                <span className="zen-arcade-stat-box__lbl">ВАШ РЕКОРД</span>
                <strong className="zen-arcade-stat-box__val text-gold">{bestScore}</strong>
              </div>
              <div className="zen-arcade-stat-box">
                <span className="zen-arcade-stat-box__lbl">ГЛАВНЫЙ ПРИЗ</span>
                <strong className="zen-arcade-stat-box__val text-cyan">PRO на 3 дня</strong>
              </div>
            </div>

            <div className="zen-arcade-actions-row">
              <button
                type="button"
                className="zen-arcade-btn-primary"
                onClick={triggerJump}
              >
                <Zap size={16} />
                <span>Начать полёт</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Оверлей: Пауза ── */}
        {gameState === 'paused' && (
          <div className="zen-arcade-overlay">
            <span className="zen-arcade-badge">ПАУЗА</span>
            <h2 className="zen-arcade-overlay-title">Полёт приостановлен</h2>
            <p className="zen-arcade-overlay-desc">
              Текущий счёт: <b>{score}</b>. Отдохните пару секунд и продолжайте рекордную серию!
            </p>
            <div className="zen-arcade-actions-row">
              <button
                type="button"
                className="zen-arcade-btn-primary"
                onClick={togglePause}
              >
                <Play size={16} />
                <span>Продолжить</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Оверлей: Game Over ── */}
        {gameState === 'gameover' && (
          <div className="zen-arcade-overlay">
            <span className="zen-arcade-badge zen-arcade-badge--red">
              РАУНД ЗАВЕРШЁН
            </span>
            <h2 className="zen-arcade-overlay-title">
              {score >= bestScore && score > 0 ? '🎉 НОВЫЙ РЕКОРД!' : 'Корабль разбился'}
            </h2>
            <p className="zen-arcade-overlay-desc">
              Ранг: <b>{rankInfo.title}</b>
            </p>

            <div className="zen-arcade-stats-panel">
              <div className="zen-arcade-stat-box">
                <span className="zen-arcade-stat-box__lbl">ИТОГОВЫЙ СЧЁТ</span>
                <strong className="zen-arcade-stat-box__val text-cyan">{score}</strong>
              </div>
              <div className="zen-arcade-stat-box">
                <span className="zen-arcade-stat-box__lbl">ЛУЧШИЙ РЕКОРД</span>
                <strong className="zen-arcade-stat-box__val text-gold">{bestScore}</strong>
              </div>
            </div>

            <div className="zen-arcade-actions-row">
              <button
                type="button"
                className="zen-arcade-btn-primary"
                onClick={triggerJump}
              >
                <RotateCcw size={16} />
                <span>Сыграть снова</span>
              </button>

              <button
                type="button"
                className="zen-arcade-btn-secondary"
                onClick={handleShare}
              >
                <Share2 size={14} />
                <span>Поделиться рекордом</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Нижняя кнопка управления прыжком ── */}
      <div className="zen-arcade-controls">
        <button
          type="button"
          className="zen-arcade-jump-btn"
          onClick={triggerJump}
        >
          <Zap size={20} />
          <span>ПРЫЖОК / ТАП</span>
        </button>
        <p className="zen-arcade-hint">
          Тапайте по экрану или кнопке, чтобы удерживать шаттл на высоте.
        </p>
      </div>

      {/* ── Тост ── */}
      {toastMsg && <div className="zen-arcade-toast">{toastMsg}</div>}
    </div>
  );
};

export default ZenovaArcadeGame;
