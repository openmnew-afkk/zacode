/* ═══════════════════════════════════════════════════════════════════════════
 *  ✨ SeasonFx — Фирменная сезонная атмосфера ZENOVA с интерактивной магией
 *  - ❄️ Зима: кристаллы льда, 6-лучевые снежинки + морозные искры
 *  - 🌸 Весна: парящие и кружащиеся лепестки Сакуры
 *  - ✨ Лето: мерцающие биолюминесцентные светлячки
 *  - 🍁 Осень: порхающие багряно-золотые кленовые листья
 *  - 🪄 Интерактив: микро-взрыв сезонных частиц при касании экрана
 *  - 🎵 Хрустальный синтезатор перезвона сезона через Web Audio API
 * ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState } from 'react';
import './SeasonFx.css';

export type FxSeason = 'winter' | 'spring' | 'summer' | 'autumn' | 'none';

interface Props {
  season: FxSeason;
}

interface SignatureParticle {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  angle: number;
  spin: number;
  phase: number;
  opacity: number;
  colorIdx?: number;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  angle: number;
  spin: number;
  life: number;
  decay: number;
  colorIdx?: number;
}

const AUTUMN_PALETTE = [
  '245, 158, 11',  // amber
  '234, 88, 12',   // orange-red
  '220, 38, 38',   // crimson
  '217, 119, 6',   // dark gold
];

/** Хрустальный перезвон сезона через Web Audio API без внешних аудио-файлов */
export function playSeasonalChime(season: string) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const freqs = season === 'winter'
      ? [1046.5, 1318.5, 1567.9, 2093]
      : season === 'spring'
      ? [880, 1108.7, 1318.5, 1760]
      : season === 'summer'
      ? [659.25, 880, 987.77, 1318.5]
      : [523.25, 659.25, 783.99, 1046.5];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.65);
    });
  } catch {}
}

/** Триггер сезонного салюта частиц из любой точки приложения */
export function triggerSeasonalBurst(x?: number, y?: number, withChime = false, season = 'winter') {
  const cx = x ?? window.innerWidth / 2;
  const cy = y ?? window.innerHeight / 3;
  window.dispatchEvent(new CustomEvent('zenova-burst-fx', { detail: { x: cx, y: cy } }));
  if (withChime) {
    playSeasonalChime(season);
  }
}

const SeasonFx: React.FC<Props> = ({ season }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('zenova_fx_off') !== '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const updateEnabled = () => {
      try {
        setEnabled(localStorage.getItem('zenova_fx_off') !== '1');
      } catch {
        setEnabled(true);
      }
    };
    window.addEventListener('zenova-fx-change', updateEnabled);
    return () => window.removeEventListener('zenova-fx-change', updateEnabled);
  }, []);

  useEffect(() => {
    if (season === 'none' || !enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // 18 фоновых атмосферных частиц
    const N = 18;
    const parts: SignatureParticle[] = Array.from({ length: N }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: season === 'summer' ? 2.2 + Math.random() * 2.2 : 3.5 + Math.random() * 4.5,
      speed: season === 'summer' ? 0.3 + Math.random() * 0.45 : 0.5 + Math.random() * 0.8,
      drift: 0.3 + Math.random() * 0.5,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.04,
      phase: Math.random() * Math.PI * 2,
      opacity: season === 'summer' ? 0.45 + Math.random() * 0.5 : 0.3 + Math.random() * 0.5,
      colorIdx: i % AUTUMN_PALETTE.length,
    }));

    // Интерактивные частицы всплеска от касания
    const bursts: BurstParticle[] = [];

    const spawnBurst = (bx: number, by: number, count = 12) => {
      for (let k = 0; k < count; k++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.5 + Math.random() * 3.8;
        bursts.push({
          x: bx,
          y: by,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1.2,
          r: 3 + Math.random() * 5,
          angle: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.12,
          life: 1.0,
          decay: 0.025 + Math.random() * 0.02,
          colorIdx: Math.floor(Math.random() * AUTUMN_PALETTE.length),
        });
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      // Игнорируем нажатия на интерактивные элементы видео/ползунки
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      spawnBurst(e.clientX, e.clientY, 10);
    };

    const onCustomBurst = (e: any) => {
      const { x, y } = e.detail || {};
      spawnBurst(x ?? width / 2, y ?? height / 3, 20);
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('zenova-burst-fx', onCustomBurst);

    let lastTime = 0;
    let t = 0;

    const drawSnowflake = (x: number, y: number, r: number, angle: number, alpha: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = `rgba(224, 242, 254, ${alpha * 0.9})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -r);
        ctx.moveTo(0, -r * 0.55);
        ctx.lineTo(-r * 0.28, -r * 0.82);
        ctx.moveTo(0, -r * 0.55);
        ctx.lineTo(r * 0.28, -r * 0.82);
        ctx.rotate(Math.PI / 3);
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawSakuraPetal = (x: number, y: number, r: number, angle: number, alpha: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = `rgba(251, 182, 206, ${alpha * 0.85})`;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.bezierCurveTo(r * 0.85, -r * 0.45, r * 0.75, r * 0.7, 0, r);
      ctx.bezierCurveTo(-r * 0.75, r * 0.7, -r * 0.85, -r * 0.45, 0, -r);
      ctx.fill();
      ctx.restore();
    };

    const drawFirefly = (x: number, y: number, r: number, alpha: number) => {
      ctx.fillStyle = `rgba(190, 242, 100, ${alpha * 0.35})`;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 255, 220, ${Math.min(1, alpha * 1.6)})`;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawAutumnLeaf = (x: number, y: number, r: number, angle: number, alpha: number, color: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = `rgba(${color}, ${alpha * 0.88})`;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.15);
      ctx.quadraticCurveTo(r * 0.85, -r * 0.2, 0, r * 1.15);
      ctx.quadraticCurveTo(-r * 0.85, -r * 0.2, 0, -r * 1.15);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.35})`;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.85);
      ctx.lineTo(0, r * 0.85);
      ctx.stroke();
      ctx.restore();
    };

    const loop = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (now - lastTime < 33) return;
      lastTime = now;
      t += 0.035;

      ctx.clearRect(0, 0, width, height);

      // 1. Отрисовка фоновых частиц
      for (let i = 0; i < N; i++) {
        const p = parts[i];
        p.angle += p.spin;

        if (season === 'summer') {
          p.y -= p.speed * 0.55;
          p.x += Math.sin(t * p.drift + p.phase) * 0.65;
          if (p.y < -12) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
        } else if (season === 'spring') {
          p.y += p.speed * 0.75;
          p.x += (Math.sin(t * p.drift + p.phase) + 0.4) * 0.85;
          if (p.y > height + 14) {
            p.y = -12;
            p.x = Math.random() * width;
          }
        } else if (season === 'autumn') {
          p.y += p.speed * 0.9;
          p.x += Math.sin(t * p.drift + p.phase) * 1.35;
          if (p.y > height + 16) {
            p.y = -14;
            p.x = Math.random() * width;
          }
        } else {
          p.y += p.speed;
          p.x += Math.sin(t * p.drift + p.phase) * 0.5;
          if (p.y > height + 14) {
            p.y = -12;
            p.x = Math.random() * width;
          }
        }

        if (season === 'winter') {
          drawSnowflake(p.x, p.y, p.r, p.angle, p.opacity);
        } else if (season === 'spring') {
          drawSakuraPetal(p.x, p.y, p.r, p.angle, p.opacity);
        } else if (season === 'summer') {
          const pulse = 0.55 + 0.45 * Math.sin(t * 3.5 + p.phase);
          drawFirefly(p.x, p.y, p.r, p.opacity * pulse);
        } else if (season === 'autumn') {
          drawAutumnLeaf(p.x, p.y, p.r, p.angle, p.opacity, AUTUMN_PALETTE[p.colorIdx || 0]);
        }
      }

      // 2. Отрисовка интерактивных частиц всплеска (Touch Bursts)
      for (let k = bursts.length - 1; k >= 0; k--) {
        const b = bursts[k];
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.08; // мягкая гравитация
        b.vx *= 0.97;
        b.angle += b.spin;
        b.life -= b.decay;

        if (b.life <= 0) {
          bursts.splice(k, 1);
          continue;
        }

        const alpha = Math.max(0, Math.min(1, b.life));

        if (season === 'winter') {
          drawSnowflake(b.x, b.y, b.r, b.angle, alpha);
        } else if (season === 'spring') {
          drawSakuraPetal(b.x, b.y, b.r, b.angle, alpha);
        } else if (season === 'summer') {
          drawFirefly(b.x, b.y, b.r, alpha);
        } else if (season === 'autumn') {
          drawAutumnLeaf(b.x, b.y, b.r, b.angle, alpha, AUTUMN_PALETTE[b.colorIdx || 0]);
        }
      }
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(loop);
    };
    document.addEventListener('visibilitychange', onVisibility);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('zenova-burst-fx', onCustomBurst);
    };
  }, [season, enabled]);

  if (season === 'none' || !enabled) return null;

  return (
    <>
      <div className={`season-fx-aurora season-fx-aurora--${season}`} aria-hidden="true" />
      <canvas ref={canvasRef} className="season-fx-canvas" aria-hidden="true" />
    </>
  );
};

export default React.memo(SeasonFx);
