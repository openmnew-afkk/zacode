import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import { triggerSeasonalBurst } from './SeasonFx';
import './FlappyChristmasGame.css';

interface FlappyChristmasGameProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TreeObstacle {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

export const FlappyChristmasGame: React.FC<FlappyChristmasGameProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { haptic } = useTelegram();
  const { activatePremiumDays } = useStore();

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [bestScore, setBestScore] = useState(() => {
    try {
      return Number(localStorage.getItem('zenova_flappy_best') || 0);
    } catch {
      return 0;
    }
  });

  const stateRef = useRef(gameState);
  stateRef.current = gameState;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const livesRef = useRef(lives);
  livesRef.current = lives;

  const playerRef = useRef({ y: 200, vy: 0, invulnerable: 0 });
  const treesRef = useRef<TreeObstacle[]>([]);
  const frameRef = useRef(0);

  const startGame = useCallback(() => {
    haptic('medium');
    playerRef.current = { y: 220, vy: -3, invulnerable: 0 };
    treesRef.current = [];
    setScore(0);
    setLives(3);
    setGameState('playing');
  }, [haptic]);

  const jump = useCallback(() => {
    if (stateRef.current === 'idle') {
      startGame();
      return;
    }
    if (stateRef.current !== 'playing') return;
    haptic('light');
    playerRef.current.vy = -4.6;
  }, [startGame, haptic]);

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let rafId = 0;
    let spawnTimer = 0;
    const gap = 175; // Широкий комфортный пролёт
    const speed = 1.55; // Плавная спокойная скорость

    const loop = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Фон: зимнее ночное небо со снегопадом
      frameRef.current++;
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#060814');
      grad.addColorStop(0.65, '#0b112c');
      grad.addColorStop(1, '#161c3c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Снежинки
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (let i = 0; i < 35; i++) {
        const sx = (i * 53 + frameRef.current * 0.6) % w;
        const sy = (i * 79 + frameRef.current * 1.1) % h;
        const r = (i % 3 === 0 ? 2 : 1.2);
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (stateRef.current === 'playing') {
        // Физика
        playerRef.current.vy += 0.22; // Нежная гравитация
        playerRef.current.y += playerRef.current.vy;

        if (playerRef.current.invulnerable > 0) {
          playerRef.current.invulnerable--;
        }

        // Спавн ёлочек
        spawnTimer++;
        if (spawnTimer > 125) {
          spawnTimer = 0;
          const minH = 70;
          const maxH = h - gap - minH;
          const topH = Math.floor(Math.random() * (maxH - minH) + minH);
          treesRef.current.push({
            x: w + 20,
            topHeight: topH,
            bottomY: topH + gap,
            passed: false,
          });
        }

        const birdX = w * 0.28;
        const birdY = playerRef.current.y;

        // Обработка ёлочек
        for (let i = treesRef.current.length - 1; i >= 0; i--) {
          const t = treesRef.current[i];
          t.x -= speed;

          // Подсчет очков
          if (!t.passed && t.x < birdX) {
            t.passed = true;
            const newScore = scoreRef.current + 1;
            setScore(newScore);
            haptic('light');

            if (newScore > bestScore) {
              setBestScore(newScore);
              try {
                localStorage.setItem('zenova_flappy_best', String(newScore));
              } catch {}
            }

            // Цель: 20 ёлочек!
            if (newScore >= 20) {
              setGameState('won');
              triggerSeasonalBurst(w / 2, h / 2, true, 'winter');
              haptic('heavy');
            }
          }

          // Мягкая коллизия (радиус 9px вокруг центра персонажа)
          if (
            playerRef.current.invulnerable === 0 &&
            birdX + 9 > t.x - 20 &&
            birdX - 9 < t.x + 20
          ) {
            if (birdY - 9 < t.topHeight || birdY + 9 > t.bottomY) {
              // Потеря 1 жизни
              const nextLives = livesRef.current - 1;
              setLives(nextLives);
              haptic('heavy');

              if (nextLives <= 0) {
                setGameState('gameover');
              } else {
                // Неуязвимость на 70 кадров (~1.2 сек)
                playerRef.current.invulnerable = 70;
                playerRef.current.vy = -3;
              }
            }
          }

          if (t.x < -80) {
            treesRef.current.splice(i, 1);
          }
        }

        // Вылет за границы экрана
        if (birdY > h - 20 || birdY < 20) {
          if (playerRef.current.invulnerable === 0) {
            const nextLives = livesRef.current - 1;
            setLives(nextLives);
            haptic('heavy');

            if (nextLives <= 0) {
              setGameState('gameover');
            } else {
              playerRef.current.invulnerable = 70;
              playerRef.current.y = h / 2;
              playerRef.current.vy = -2;
            }
          }
        }
      }

      // ── Отрисовка красивых ёлочек ──
      for (const t of treesRef.current) {
        // Верхняя заснеженная ёлочка (ствол вверх, ветви вниз)
        ctx.fillStyle = '#0f5132';
        // Ветви верхние
        ctx.beginPath();
        ctx.moveTo(t.x - 24, 0);
        ctx.lineTo(t.x + 24, 0);
        ctx.lineTo(t.x + 18, t.topHeight - 18);
        ctx.lineTo(t.x, t.topHeight);
        ctx.lineTo(t.x - 18, t.topHeight - 18);
        ctx.closePath();
        ctx.fill();

        // Снежная шапка на конце верхней ветви
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(t.x, t.topHeight, 7, 0, Math.PI * 2);
        ctx.fill();

        // Нижняя красивая пышная елка
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.moveTo(t.x, t.bottomY);
        ctx.lineTo(t.x + 22, t.bottomY + 30);
        ctx.lineTo(t.x + 12, t.bottomY + 30);
        ctx.lineTo(t.x + 26, t.bottomY + 65);
        ctx.lineTo(t.x + 16, t.bottomY + 65);
        ctx.lineTo(t.x + 30, h);
        ctx.lineTo(t.x - 30, h);
        ctx.lineTo(t.x - 16, t.bottomY + 65);
        ctx.lineTo(t.x - 26, t.bottomY + 65);
        ctx.lineTo(t.x - 12, t.bottomY + 30);
        ctx.lineTo(t.x - 22, t.bottomY + 30);
        ctx.closePath();
        ctx.fill();

        // Снежные пушистые шапки на ветвях
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(t.x, t.bottomY + 3, 9, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(t.x + 14, t.bottomY + 30, 8, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(t.x - 14, t.bottomY + 30, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Новогодние светящиеся шарики на ёлке
        const colors = ['#f43f5e', '#ffd56b', '#38bdf8', '#c084fc'];
        for (let b = 0; b < 3; b++) {
          ctx.fillStyle = colors[(b + Math.floor(frameRef.current / 25)) % colors.length];
          ctx.beginPath();
          ctx.arc(t.x - 8 + b * 8, t.bottomY + 20 + b * 18, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Отрисовка персонажа (Олень Рудольф / Сани с мягким мерцанием) ──
      const bx = w * 0.28;
      const by = playerRef.current.y;
      const isInv = playerRef.current.invulnerable > 0 && Math.floor(frameRef.current / 4) % 2 === 0;

      if (!isInv) {
        ctx.save();
        ctx.translate(bx, by);
        // Небольшой наклон по вертикальной скорости
        const rot = Math.max(-0.4, Math.min(0.4, playerRef.current.vy * 0.08));
        ctx.rotate(rot);

        // Золотистый шлейф за оленем
        ctx.fillStyle = 'rgba(255, 213, 107, 0.28)';
        ctx.beginPath();
        ctx.arc(-16, 2, 7, 0, Math.PI * 2);
        ctx.arc(-26, 4, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🦌', 0, 0);
        ctx.restore();
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen, bestScore, haptic]);

  const claimReward = () => {
    haptic('heavy');
    activatePremiumDays(3);
    triggerSeasonalBurst(window.innerWidth / 2, window.innerHeight / 2, true, 'winter');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="flappy-game-screen" role="dialog" aria-modal="true">
      {/* Верхняя игровая панель */}
      <header className="flappy-topbar">
        <div className="flappy-topbar__left">
          <div className="flappy-topbar__lives" aria-label={`Жизни: ${lives}`}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <span key={idx}>{idx < lives ? '❤️' : '🤍'}</span>
            ))}
          </div>
          <div className="flappy-topbar__score-pill">
            <span>🌲 {score} / 20</span>
          </div>
        </div>

        <button
          type="button"
          className="flappy-topbar__close"
          onClick={onClose}
          aria-label="Закрыть игру"
        >
          ✕
        </button>
      </header>

      {/* Игровая сцена */}
      <div className="flappy-stage" onClick={jump}>
        <canvas ref={canvasRef} className="flappy-canvas" />

        {gameState === 'idle' && (
          <div className="flappy-screen-overlay">
            <div className="flappy-overlay-mascot">🦌</div>
            <h2 className="flappy-screen-title">Ёлочный Прыгун</h2>
            <p className="flappy-screen-desc">
              Тапайте по экрану — олень легко взлетает и пролетает сквозь новогодние ёлочки. У вас <b>3 жизни</b>!
            </p>
            <div className="flappy-screen-perks">
              <span>🎁 Пройдите 20 ёлочек → 3 дня PRO</span>
            </div>
            <button
              type="button"
              className="flappy-action-btn"
              onClick={startGame}
            >
              Начать полёт ✨
            </button>
          </div>
        )}

        {gameState === 'won' && (
          <div className="flappy-screen-overlay">
            <div className="flappy-overlay-mascot">🏆</div>
            <h2 className="flappy-screen-title">Потрясающе!</h2>
            <div className="flappy-win-reward">
              <strong>ВЫ ПРОШЛИ 20 ЁЛОЧЕК!</strong>
              <span>Вам начислено +3 ДНЯ ZENOVA PRO бесплатно!</span>
            </div>
            <button
              type="button"
              className="flappy-action-btn flappy-action-btn--gold"
              onClick={claimReward}
            >
              Забрать ZENOVA PRO 🎁
            </button>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="flappy-screen-overlay">
            <div className="flappy-overlay-mascot">❄️</div>
            <h2 className="flappy-screen-title">Зацепили ветви!</h2>
            <p className="flappy-screen-desc">
              Ваш результат: <b>{score}</b> из 20 ёлочек.<br />
              Лучший рекорд: <b>{bestScore}</b>
            </p>
            <button
              type="button"
              className="flappy-action-btn"
              onClick={startGame}
            >
              Сыграть ещё раз
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlappyChristmasGame;
