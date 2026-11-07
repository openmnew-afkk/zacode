/* ═══════════════════════════════════════════════════════════════════════════
 *  ✨ SeasonFx Ultra-Light — Плавная сезонная атмосфера БЕЗ нагрузки на CPU/GPU
 *  Оптимизировано для iOS / Android WebView (0 shadowBlur, DPR=1, 30fps cap)
 * ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState } from 'react';
import './SeasonFx.css';

type FxSeason = 'winter' | 'spring' | 'summer' | 'autumn' | 'none';

interface Props {
  season: FxSeason;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  phase: number;
  opacity: number;
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

    // 16 лёгких частиц без shadowBlur = 0% нагрузки на телефон
    const N = 16;
    const parts: Particle[] = Array.from({ length: N }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.2 + Math.random() * 2.0,
      speed: 0.35 + Math.random() * 0.55,
      drift: 0.25 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.18 + Math.random() * 0.32,
    }));

    const colorMap: Record<string, string> = {
      winter: '224, 242, 254',
      spring: '251, 207, 232',
      summer: '253, 230, 138',
      autumn: '253, 186, 116',
    };
    const rgb = colorMap[season] || colorMap.winter;

    let lastTime = 0;
    let t = 0;

    const loop = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      // Throttle to ~30fps so scrolling and animations stay 100% butter-smooth
      if (now - lastTime < 33) return;
      lastTime = now;
      t += 0.03;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < N; i++) {
        const f = parts[i];
        if (season === 'summer') {
          f.y -= f.speed * 0.45;
          if (f.y < -8) {
            f.y = height + 8;
            f.x = Math.random() * width;
          }
        } else {
          f.y += f.speed;
          if (f.y > height + 8) {
            f.y = -8;
            f.x = Math.random() * width;
          }
        }
        f.x += Math.sin(t * f.drift + f.phase) * 0.45;

        ctx.fillStyle = `rgba(${rgb}, ${f.opacity})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
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
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [season, enabled]);

  if (season === 'none' || !enabled) return null;

  return (
    <canvas ref={canvasRef} className="season-fx-canvas" aria-hidden="true" />
  );
};

export default React.memo(SeasonFx);
