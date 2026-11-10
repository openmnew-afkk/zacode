import React, { useEffect, useRef, useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import { triggerSeasonalBurst } from './SeasonFx';
import './FlappyChristmasGame.css';

interface FlappyChristmasGameProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TreePipe {
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

  const birdRef = useRef({ y: 150, vy: 0 });
  const pipesRef = useRef<TreePipe[]>([]);
  const frameRef = useRef(0);

  const startGame = () => {
    haptic('medium');
    birdRef.current = { y: 150, vy: -3 };
    pipesRef.current = [];
    setScore(0);
    setGameState('playing');
  };

  const jump = () => {
    if (stateRef.current === 'idle') {
      startGame();
      return;
    }
    if (stateRef.current !== 'playing') return;
    haptic('light');
    birdRef.current.vy = -5.8;
  };

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;

    let rafId = 0;
    let spawnTimer = 0;
    const gap = 145; // комфортный пролет между елками
    const speed = 2.1;

    const loop = () => {
      ctx.clearRect(0, 0, width, height);

      // Фон: падающие снежинки на заднем плане
      frameRef.current++;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 25; i++) {
        const sx = ((i * 47 + frameRef.current * 0.7) % width);
        const sy = ((i * 73 + frameRef.current * 1.2) % height);
        ctx.fillRect(sx, sy, 2, 2);
      }

      if (stateRef.current === 'playing') {
        // Физика птицы (оленя)
        birdRef.current.vy += 0.32;
        birdRef.current.y += birdRef.current.vy;

        // Генерация елочек
        spawnTimer++;
        if (spawnTimer > 105) {
          spawnTimer = 0;
          const minH = 40;
          const maxH = height - gap - minH;
          const topH = Math.floor(Math.random() * (maxH - minH) + minH);
          pipesRef.current.push({
            x: width + 10,
            topHeight: topH,
            bottomY: topH + gap,
            passed: false,
          });
        }

        // Движение елочек
        for (let i = pipesRef.current.length - 1; i >= 0; i--) {
          const p = pipesRef.current[i];
          p.x -= speed;

          // Подсчет очков
          if (!p.passed && p.x < width / 3) {
            p.passed = true;
            const newScore = scoreRef.current + 1;
            setScore(newScore);
            haptic('light');

            if (newScore > bestScore) {
              setBestScore(newScore);
              try {
                localStorage.setItem('zenova_flappy_best', String(newScore));
              } catch {}
            }

            // Цель 30 елочек достигнута!
            if (newScore >= 30) {
              setGameState('won');
              triggerSeasonalBurst(window.innerWidth / 2, window.innerHeight / 2, true, 'winter');
              haptic('heavy');
            }
          }

          // Коллизия с елками (радиус 16)
          const birdX = width / 3;
          const birdY = birdRef.current.y;
          if (birdX + 14 > p.x && birdX - 14 < p.x + 36) {
            if (birdY - 14 < p.topHeight || birdY + 14 > p.bottomY) {
              setGameState('gameover');
              haptic('heavy');
            }
          }

          if (p.x < -60) {
            pipesRef.current.splice(i, 1);
          }
        }

        // Проверка падения / вылета
        if (birdRef.current.y > height - 15 || birdRef.current.y < 10) {
          setGameState('gameover');
          haptic('heavy');
        }
      }

      // Отрисовка елочек
      for (const p of pipesRef.current) {
        // Верхняя елка (перевернутая)
        ctx.fillStyle = '#065f46';
        ctx.fillRect(p.x, 0, 36, p.topHeight);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x - 3, p.topHeight - 5, 42, 6);

        // Нижняя елка
        ctx.fillStyle = '#047857';
        ctx.fillRect(p.x, p.bottomY, 36, height - p.bottomY);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x - 3, p.bottomY, 42, 6);
      }

      // Отрисовка персонажа: Олень Рудольф с красным носом
      const bx = width / 3;
      const by = birdRef.current.y;
      ctx.save();
      ctx.translate(bx, by);
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🦌', 0, 0);
      ctx.restore();

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isOpen, bestScore, haptic]);

  const claimReward = () => {
    haptic('heavy');
    // +3 дня премиума
    activatePremiumDays(3);
    triggerSeasonalBurst(window.innerWidth / 2, window.innerHeight / 2, true, 'winter');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="flappy-game-modal" role="dialog" aria-modal="true">
      <div className="flappy-game-card">
        <div className="flappy-game-head">
          <div className="flappy-game-title">
            <span>🌲</span>
            <span>Ёлочный Прыгун</span>
          </div>
          <button type="button" className="flappy-game-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="flappy-canvas-wrap" onClick={jump}>
          <canvas ref={canvasRef} className="flappy-canvas" />

          <div className="flappy-score-badge">
            <span>🌲 {score} / 30</span>
          </div>

          {gameState === 'idle' && (
            <div className="flappy-overlay">
              <div className="flappy-overlay-icon">🦌</div>
              <h3 className="flappy-overlay-title">Зимний Челлендж</h3>
              <p className="flappy-overlay-text">
                Тапай по экрану, чтобы олень прыгал и пролетал между заснеженными ёлками.
              </p>
              <div className="flappy-overlay-goal">
                <span>🎁 Перепрыгни 30 ёлочек → 3 дня PRO</span>
              </div>
              <button type="button" className="flappy-btn-play" onClick={startGame}>
                Начать полёт
              </button>
            </div>
          )}

          {gameState === 'won' && (
            <div className="flappy-overlay">
              <div className="flappy-overlay-icon">🏆</div>
              <h3 className="flappy-overlay-title">Грандиозная победа!</h3>
              <div className="flappy-reward-box">
                <div className="flappy-reward-title">Вам начислено +3 ДНЯ ZENOVA PRO!</div>
                <div className="flappy-reward-sub">Вы мастерски преодолели 30 новогодних ёлок!</div>
              </div>
              <button type="button" className="flappy-btn-play" onClick={claimReward}>
                Забрать награду 🎁
              </button>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="flappy-overlay">
              <div className="flappy-overlay-icon">❄️</div>
              <h3 className="flappy-overlay-title">Зацепили ёлку!</h3>
              <p className="flappy-overlay-text">
                Ваш результат: <b>{score}</b> из 30 ёлок.<br />
                Рекорд: <b>{bestScore}</b>
              </p>
              <button type="button" className="flappy-btn-play" onClick={startGame}>
                Попробовать снова
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlappyChristmasGame;
