/* ═══════════════════════════════════════════════════════════════════════════
 *  ❄️ SeasonSnow — лёгкий canvas-снегопад для новогодней темы
 *  Без библиотек, 60 FPS, пауза при скрытой вкладке.
 * ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef } from 'react';
import './SeasonFx.css';

interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  phase: number;
  opacity: number;
}

const SeasonSnow: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      canvas.width = window.innerWidth * DPR;
      canvas.height = window.innerHeight * DPR;
    };
    resize();
    window.addEventListener('resize', resize);

    const N = 46;
    const flakes: Flake[] = Array.from({ length: N }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 1 + Math.random() * 2.6,
      speed: 0.35 + Math.random() * 0.85,
      drift: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.35 + Math.random() * 0.45,
    }));

    const onVisibility = () => {
      running = !document.hidden;
      if (running) loop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let t = 0;
    const loop = () => {
      if (!running) return;
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(DPR, DPR);

      for (const f of flakes) {
        f.y += f.speed;
        f.x += Math.sin(t * f.drift + f.phase) * 0.4;

        if (f.y > window.innerHeight + 6) {
          f.y = -6;
          f.x = Math.random() * window.innerWidth;
        }
        if (f.x > window.innerWidth + 6) f.x = -6;
        if (f.x < -6) f.x = window.innerWidth + 6;

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 240, 253, ${f.opacity})`;
        ctx.shadowColor = 'rgba(186, 230, 253, 0.8)';
        ctx.shadowBlur = f.r * 2.2;
        ctx.fill();
      }
      ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="season-fx-snow" aria-hidden="true" />;
};

export default SeasonSnow;
