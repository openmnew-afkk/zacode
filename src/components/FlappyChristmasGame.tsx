import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store';
import { triggerSeasonalBurst } from './SeasonFx';
import './FlappyChristmasGame.css';

interface FlappyChristmasGameProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Tree {
  x: number;
  topHeight: number;
  bottomY: number;
  passed: boolean;
}

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export const FlappyChristmasGame: React.FC<FlappyChristmasGameProps> = ({
  isOpen,
  onClose,
}) => {
  const { haptic } = useTelegram();
  const { activatePremiumDays } = useStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'won'>('idle');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    try {
      return Number(localStorage.getItem('zenova_flappy_best') || 0);
    } catch {
      return 0;
    }
  });
  const [lives, setLives] = useState(3);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  // Ссылки для игрового цикла (чтобы не было рассинхрона стейта)
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  const scoreRef = useRef(score);
  scoreRef.current = score;

  const livesRef = useRef(lives);
  livesRef.current = lives;

  const playerRef = useRef({ y: 260, vy: 0, invulnerable: 0 });
  const treesRef = useRef<Tree[]>([]);
  const particlesRef = useRef<TrailParticle[]>([]);
  const frameRef = useRef(0);

  // Инициализация и запуск игрового цикла
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
    const gap = 180; // Широкий комфортный пролёт для плавного полета
    const speed = 1.6; // Приятная скорость

    const loop = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      frameRef.current++;

      // ── Фон: Градиент ночного зимнего неба ──
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#04060f');
      grad.addColorStop(0.55, '#0b112c');
      grad.addColorStop(1, '#151d42');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Снегопад на фоне
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 47 + frameRef.current * 0.65) % w;
        const sy = (i * 73 + frameRef.current * 1.15) % h;
        const r = i % 4 === 0 ? 2 : 1.2;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (stateRef.current === 'playing') {
        // Физика полёта
        playerRef.current.vy += 0.22; // Нежная гравитация
        playerRef.current.y += playerRef.current.vy;

        if (playerRef.current.invulnerable > 0) {
          playerRef.current.invulnerable--;
        }

        // Спавн ёлочек
        spawnTimer++;
        if (spawnTimer > 120) {
          spawnTimer = 0;
          const minH = 75;
          const maxH = h - gap - minH;
          const topH = Math.floor(Math.random() * (maxH - minH) + minH);
          treesRef.current.push({
            x: w + 30,
            topHeight: topH,
            bottomY: topH + gap,
            passed: false,
          });
        }

        const birdX = w * 0.26;
        const birdY = playerRef.current.y;

        // Генерация шлейфа звёздной пыли за оленем
        if (frameRef.current % 2 === 0) {
          particlesRef.current.push({
            x: birdX - 16,
            y: birdY + (Math.random() * 8 - 4),
            vx: -(Math.random() * 1.8 + 1.2),
            vy: (Math.random() - 0.5) * 0.8,
            life: 28,
            maxLife: 28,
            size: Math.random() * 2.5 + 1.5,
            color: Math.random() > 0.4 ? '#ffd56b' : '#38bdf8',
          });
        }

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

          // Мягкая коллизия: радиус 9px вокруг центра персонажа
          if (
            playerRef.current.invulnerable === 0 &&
            birdX + 9 > t.x - 22 &&
            birdX - 9 < t.x + 22
          ) {
            if (birdY - 9 < t.topHeight || birdY + 9 > t.bottomY) {
              // Потеря 1 жизни
              const nextLives = livesRef.current - 1;
              setLives(nextLives);
              haptic('heavy');

              if (nextLives <= 0) {
                setGameState('gameover');
              } else {
                // Неуязвимость на 75 кадров (~1.25 сек)
                playerRef.current.invulnerable = 75;
                // Небольшой отскок
                playerRef.current.vy = -2.5;
              }
            }
          }

          // Удаление старых ёлочек
          if (t.x < -80) {
            treesRef.current.splice(i, 1);
          }
        }

        // Выход за границы экрана
        if (birdY < 20) {
          playerRef.current.y = 20;
          playerRef.current.vy = 0;
        } else if (birdY > h - 40) {
          setGameState('gameover');
          haptic('heavy');
        }
      }

      // ── Отрисовка частиц шлейфа ──
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      // ── Отрисовка заснеженных новогодних ёлок ──
      for (const t of treesRef.current) {
        // 1. Верхняя сосульковая ёлка
        ctx.fillStyle = '#064e3b';
        ctx.beginPath();
        ctx.moveTo(t.x, t.topHeight);
        ctx.lineTo(t.x + 24, t.topHeight - 34);
        ctx.lineTo(t.x + 14, t.topHeight - 34);
        ctx.lineTo(t.x + 28, t.topHeight - 70);
        ctx.lineTo(t.x + 18, t.topHeight - 70);
        ctx.lineTo(t.x + 32, 0);
        ctx.lineTo(t.x - 32, 0);
        ctx.lineTo(t.x - 18, t.topHeight - 70);
        ctx.lineTo(t.x - 28, t.topHeight - 70);
        ctx.lineTo(t.x - 14, t.topHeight - 34);
        ctx.lineTo(t.x - 24, t.topHeight - 34);
        ctx.closePath();
        ctx.fill();

        // Снежные шапки на верхней ёлке
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.ellipse(t.x, t.topHeight - 3, 10, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(t.x + 16, t.topHeight - 34, 9, 4.5, 0, 0, Math.PI * 2);
        ctx.ellipse(t.x - 16, t.topHeight - 34, 9, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Нижняя пушистая ёлка
        ctx.fillStyle = '#065f46';
        ctx.beginPath();
        ctx.moveTo(t.x, t.bottomY);
        ctx.lineTo(t.x + 24, t.bottomY + 34);
        ctx.lineTo(t.x + 14, t.bottomY + 34);
        ctx.lineTo(t.x + 28, t.bottomY + 70);
        ctx.lineTo(t.x + 18, t.bottomY + 70);
        ctx.lineTo(t.x + 32, h);
        ctx.lineTo(t.x - 32, h);
        ctx.lineTo(t.x - 18, t.bottomY + 70);
        ctx.lineTo(t.x - 28, t.bottomY + 70);
        ctx.lineTo(t.x - 14, t.bottomY + 34);
        ctx.lineTo(t.x - 24, t.bottomY + 34);
        ctx.closePath();
        ctx.fill();

        // Золотая звезда на верхушке нижней ёлки
        ctx.fillStyle = '#ffd56b';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⭐', t.x, t.bottomY - 4);

        // Снежные шапки на нижней ёлке
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(t.x, t.bottomY + 5, 10, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(t.x + 16, t.bottomY + 34, 9, 4.5, 0, 0, Math.PI * 2);
        ctx.ellipse(t.x - 16, t.bottomY + 34, 9, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Разноцветные праздничные шарики
        const ballColors = ['#f43f5e', '#ffd56b', '#38bdf8', '#c084fc'];
        for (let b = 0; b < 3; b++) {
          ctx.fillStyle = ballColors[(b + Math.floor(frameRef.current / 20)) % ballColors.length];
          ctx.beginPath();
          ctx.arc(t.x - 8 + b * 8, t.bottomY + 22 + b * 18, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Отрисовка персонажа (Олень Рудольф, смотрящий ВПЕРЁД / ВПРАВО) ──
      const bx = w * 0.26;
      const by = playerRef.current.y;
      const isInv =
        playerRef.current.invulnerable > 0 && Math.floor(frameRef.current / 4) % 2 === 0;

      if (!isInv) {
        ctx.save();
        ctx.translate(bx, by);

        // Наклон по вертикальной скорости
        const rot = Math.max(-0.35, Math.min(0.35, playerRef.current.vy * 0.07));
        ctx.rotate(rot);

        // 🌟 ОТЗЕРКАЛИВАЕМ ПО ГОРИЗОНТАЛИ, ЧТОБЫ ОЛЕНЬ СМОТРЕЛ ВПЕРЁД В СТОРОНУ ПОЛЁТА
        ctx.scale(-1, 1);

        ctx.font = '34px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🦌', 0, 0);

        // Красный светящийся нос Рудольфа на кончике морды
        ctx.fillStyle = '#ff2244';
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(-13, 2, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

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

  // Обработка прыжка
  const handleJump = useCallback(() => {
    if (stateRef.current === 'idle') {
      setGameState('playing');
      setScore(0);
      setLives(3);
      playerRef.current = { y: window.innerHeight * 0.42, vy: -4.8, invulnerable: 0 };
      treesRef.current = [];
      particlesRef.current = [];
      haptic('light');
    } else if (stateRef.current === 'playing') {
      playerRef.current.vy = -4.8; // Комфортный упругий взмах
      haptic('light');

      // Создаем всплеск звездочек при прыжке
      const bx = window.innerWidth * 0.26;
      const by = playerRef.current.y;
      for (let i = 0; i < 5; i++) {
        particlesRef.current.push({
          x: bx - 14,
          y: by + (Math.random() * 10 - 5),
          vx: -(Math.random() * 2.2 + 1),
          vy: Math.random() * 2 - 1,
          life: 22,
          maxLife: 22,
          size: Math.random() * 3 + 1.5,
          color: '#ffd56b',
        });
      }
    }
  }, [haptic]);

  // Перезапуск игры
  const handleRestart = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setRewardClaimed(false);
    playerRef.current = { y: window.innerHeight * 0.42, vy: -4.8, invulnerable: 0 };
    treesRef.current = [];
    particlesRef.current = [];
    haptic('light');
  }, [haptic]);

  // Получение приза (3 дня PRO)
  const handleClaimReward = useCallback(() => {
    if (rewardClaimed) return;
    activatePremiumDays(3);
    setRewardClaimed(true);
    haptic('heavy');
    triggerSeasonalBurst(window.innerWidth / 2, window.innerHeight / 2, true, 'winter');
  }, [rewardClaimed, activatePremiumDays, haptic]);

  if (!isOpen) return null;

  return (
    <div className="flappy-game-overlay">
      <canvas
        ref={canvasRef}
        className="flappy-game-canvas"
        onPointerDown={handleJump}
      />

      {/* Верхний статус-бар */}
      <div className="flappy-game-hud">
        <button
          type="button"
          className="flappy-close-btn"
          onClick={() => {
            haptic('light');
            onClose();
          }}
        >
          ✕
        </button>

        <div className="flappy-lives-badge">
          {Array.from({ length: 3 }).map((_, i) => (
            <span
              key={i}
              className={`flappy-heart ${i < lives ? 'active' : 'lost'}`}
            >
              ❤️
            </span>
          ))}
        </div>

        <div className="flappy-score-pill">
          <span className="flappy-score-num">{score}</span>
          <span className="flappy-score-target">/ 20</span>
        </div>
      </div>

      {/* Экран начала */}
      {gameState === 'idle' && (
        <div className="flappy-start-modal" onPointerDown={handleJump}>
          <div className="flappy-modal-card">
            <div className="flappy-start-icon">🦌✨</div>
            <h2 className="flappy-modal-title">Зимний Марафон</h2>
            <p className="flappy-modal-desc">
              Помогите Рудольфу пролететь через <strong>20 заснеженных ёлочек</strong>.
              У вас есть 3 попытки! За победу дарим <strong>3 дня ZENOVA PRO</strong>.
            </p>
            <div className="flappy-tap-hint">Нажмите на экран для старта</div>
          </div>
        </div>
      )}

      {/* Экран поражения */}
      {gameState === 'gameover' && (
        <div className="flappy-end-modal">
          <div className="flappy-modal-card">
            <div className="flappy-gameover-icon">❄️</div>
            <h2 className="flappy-modal-title">Не сдавайтесь!</h2>
            <p className="flappy-modal-desc">
              Вы преодолели <strong>{score}</strong> из 20 ёлочек.
              {bestScore > 0 && ` Лучший результат: ${bestScore}.`}
            </p>
            <div className="flappy-btn-row">
              <button
                type="button"
                className="flappy-action-btn flappy-btn--accent"
                onClick={handleRestart}
              >
                Попробовать снова 🔄
              </button>
              <button
                type="button"
                className="flappy-action-btn flappy-btn--ghost"
                onClick={onClose}
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Экран победы */}
      {gameState === 'won' && (
        <div className="flappy-end-modal">
          <div className="flappy-modal-card">
            <div className="flappy-won-icon">🏆👑</div>
            <h2 className="flappy-modal-title">ПОБЕДА!</h2>
            <p className="flappy-modal-desc">
              Вы успешно провели Рудольфа через весь сказочный лес!
            </p>
            {!rewardClaimed ? (
              <button
                type="button"
                className="flappy-action-btn flappy-btn--gold"
                onClick={handleClaimReward}
              >
                Забрать 3 дня ZENOVA PRO 🎁
              </button>
            ) : (
              <div className="flappy-claimed-badge">
                ✓ 3 дня ZENOVA PRO начислены!
              </div>
            )}
            <button
              type="button"
              className="flappy-action-btn flappy-btn--ghost"
              onClick={onClose}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlappyChristmasGame;
