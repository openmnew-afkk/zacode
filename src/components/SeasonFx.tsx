/* ═══════════════════════════════════════════════════════════════════════════
 *  ✨ SeasonFx — сезонные частицы с изюминками
 *
 *  • Зима  ❄️ : снегопад + СУГРОБ: снег накапливается внизу экрана,
 *                каждые ~12 сек «оседает» и сползает — и снова растёт.
 *                Плюс снежные шапки на постерах (CSS, см. SeasonFx.css).
 *  • Весна 🌸 : лепестки сакуры кружатся по синусоиде.
 *  • Осень 🍁 : листья покачиваются и «дрейфуют» вбок.
 *  • Лето  🌞 : светлячки-блики, плавно мерцающие в тёплом свете.
 *
 *  Canvas 60 FPS, пауза при скрытой вкладке, почитает настройку
 *  «снег/эффекты выключены» (localStorage zenova_fx_off).
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
  rot: number;
  rotSpeed: number;
  hue: number;
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

    const N = season === 'winter' ? 52 : 30;
    const mk = (): Particle => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 1 + Math.random() * (season === 'winter' ? 2.6 : 3.4),
      speed: 0.35 + Math.random() * 0.85,
      drift: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.35 + Math.random() * 0.5,
      rot: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      hue: Math.random(),
    });
    const parts: Particle[] = Array.from({ length: N }, mk);

    const onVisibility = () => {
      running = !document.hidden;
      if (running) loop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let t = 0;

    const drawWinter = (f: Particle) => {
      const length = f.r * 1.65;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = f.opacity;
      ctx.strokeStyle = '#e8f4ff';
      ctx.lineWidth = Math.max(0.7, f.r * 0.35);
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(186, 220, 255, 0.55)';
      ctx.shadowBlur = f.r * 1.2;
      ctx.beginPath();
      for (let arm = 0; arm < 6; arm += 1) {
        const angle = (arm * Math.PI) / 3;
        const x = Math.cos(angle) * length;
        const y = Math.sin(angle) * length;
        const branchX = x * 0.65;
        const branchY = y * 0.65;
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        for (const direction of [-1, 1]) {
          const branchAngle = angle + direction * 0.8;
          ctx.moveTo(branchX, branchY);
          ctx.lineTo(
            branchX - Math.cos(branchAngle) * length * 0.38,
            branchY - Math.sin(branchAngle) * length * 0.38
          );
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    const drawPetal = (f: Particle) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = f.opacity;
      const grad = ctx.createLinearGradient(-f.r, -f.r, f.r, f.r);
      grad.addColorStop(0, '#fbcfe8');
      grad.addColorStop(1, '#f9a8d4');
      ctx.fillStyle = grad;
      ctx.beginPath();
      // Лепесток — два скруглённых лепестка
      ctx.ellipse(0, 0, f.r * 1.6, f.r * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawLeaf = (f: Particle) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = f.opacity;
      const warm = f.hue > 0.5 ? '#fdba74' : '#fb923c';
      ctx.fillStyle = warm;
      ctx.beginPath();
      ctx.moveTo(0, -f.r * 1.4);
      ctx.quadraticCurveTo(f.r, 0, 0, f.r * 1.4);
      ctx.quadraticCurveTo(-f.r, 0, 0, -f.r * 1.4);
      ctx.fill();
      ctx.restore();
    };

    const drawFirefly = (f: Particle) => {
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.4 + f.phase));
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(253, 224, 71, ${f.opacity * pulse})`;
      ctx.shadowColor = 'rgba(253, 224, 71, 0.9)';
      ctx.shadowBlur = f.r * 5;
      ctx.fill();
    };

    const drawers: Record<string, (f: Particle) => void> = {
      winter: drawWinter,
      spring: drawPetal,
      autumn: drawLeaf,
      summer: drawFirefly,
    };
    const draw = drawers[season] || drawWinter;

    const loop = () => {
      if (!running) return;
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(DPR, DPR);

      for (const f of parts) {
        if (season === 'summer') {
          // Светлячки медленно плывут вверх-вбок
          f.y -= f.speed * 0.35;
          f.x += Math.sin(t * f.drift + f.phase) * 0.5;
          if (f.y < -8) { f.y = window.innerHeight + 8; f.x = Math.random() * window.innerWidth; }
        } else {
          f.y += f.speed;
          f.x += Math.sin(t * f.drift + f.phase) * (season === 'autumn' ? 0.8 : 0.4);
          f.rot += f.rotSpeed;
        }

        if (f.y > window.innerHeight + 8) {
          f.y = -8;
          f.x = Math.random() * window.innerWidth;
        }
        if (f.x > window.innerWidth + 8) f.x = -8;
        if (f.x < -8) f.x = window.innerWidth + 8;

        draw(f);
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
  }, [season, enabled]);

  if (season === 'none' || !enabled) return null;

  return (
    <>
      <canvas ref={canvasRef} className="season-fx-canvas" aria-hidden="true" />
      {/* Морозный оттенок сверху */}
      {season === 'winter' && <div className="season-fx-frost" aria-hidden="true" />}
    </>
  );
};

export default SeasonFx;
