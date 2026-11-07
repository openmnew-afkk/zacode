/* ═══════════════════════════════════════════════════════════════════════════
 *  ✨ SeasonFx PRO — Минималистичная сезонная атмосфера (Aurora + 3D-частицы)
 *
 *  Никаких нагромождённых проводов сверху, мешающих кнопкам Telegram —
 *  только благородное северное/сезонное сияние (Aurora Borealis) и
 *  многослойные частицы с глубиной резкости (Depth-of-Field Bokeh):
 *  • Зима (Новогодняя) 🎄: полярное сияние, резные ледяные кристаллы,
 *      мягкий снежный пух и тёплые золотые искры шампанского
 *  • Весна 🌸 : кварцевый рассвет и реалистичные изогнутые лепестки сакуры
 *  • Лето  🌞 : лазурный бриз и парящие золотисто-бирюзовые светлячки
 *  • Осень 🍁 : янтарное свечение и кружащиеся кленовые листья с тёплыми искрами
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
  z: number; // глубина (0.4 .. 1.2) для эффекта параллакса и боке
  r: number;
  speed: number;
  drift: number;
  phase: number;
  opacity: number;
  rot: number;
  rotSpeed: number;
  hue: number;
  kind: 'crystal' | 'fluff' | 'spark';
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

    const N = season === 'winter' ? 46 : 30;
    const mk = (_: unknown, idx: number): Particle => {
      const roll = idx / N;
      const kind: Particle['kind'] =
        season === 'winter'
          ? roll < 0.35
            ? 'crystal'
            : roll < 0.82
              ? 'fluff'
              : 'spark'
          : roll < 0.78
            ? 'crystal'
            : 'spark';

      const z = 0.45 + Math.random() * 0.75;

      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z,
        r:
          kind === 'spark'
            ? (1.8 + Math.random() * 2.8) * z
            : (1.2 + Math.random() * (season === 'winter' ? 2.4 : 3.2)) * z,
        speed:
          kind === 'spark'
            ? (0.16 + Math.random() * 0.28) * z
            : (0.28 + Math.random() * 0.65) * z,
        drift: 0.25 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        opacity:
          kind === 'spark'
            ? 0.14 + Math.random() * 0.28
            : (0.25 + Math.random() * 0.45) * Math.min(1, z),
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.022,
        hue: Math.random(),
        kind,
      };
    };
    const parts: Particle[] = Array.from({ length: N }, mk);

    const onVisibility = () => {
      running = !document.hidden;
      if (running) loop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let t = 0;

    const drawWinter = (f: Particle) => {
      if (f.kind === 'spark') {
        const pulse = 0.4 + 0.6 * Math.sin(t * 2.0 + f.phase);
        ctx.save();
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        const isGold = f.hue > 0.38;
        ctx.fillStyle = isGold
          ? `rgba(253, 224, 138, ${f.opacity * pulse})`
          : `rgba(186, 230, 253, ${f.opacity * pulse})`;
        ctx.shadowColor = isGold ? 'rgba(251, 191, 36, 0.65)' : 'rgba(56, 189, 248, 0.65)';
        ctx.shadowBlur = f.r * 3.2;
        ctx.fill();
        ctx.restore();
        return;
      }

      if (f.kind === 'fluff') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 249, 255, ${f.opacity * 0.85})`;
        ctx.shadowColor = 'rgba(186, 230, 253, 0.55)';
        ctx.shadowBlur = f.r * 2;
        ctx.fill();
        ctx.restore();
        return;
      }

      const length = f.r * 1.7;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = f.opacity;
      ctx.strokeStyle = '#f0f9ff';
      ctx.lineWidth = Math.max(0.7, f.r * 0.32);
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(125, 211, 252, 0.55)';
      ctx.shadowBlur = f.r * 1.2;
      ctx.beginPath();
      for (let arm = 0; arm < 6; arm += 1) {
        const angle = (arm * Math.PI) / 3;
        const x = Math.cos(angle) * length;
        const y = Math.sin(angle) * length;
        const branchX = x * 0.62;
        const branchY = y * 0.62;
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        for (const direction of [-1, 1]) {
          const branchAngle = angle + direction * 0.75;
          ctx.moveTo(branchX, branchY);
          ctx.lineTo(
            branchX - Math.cos(branchAngle) * length * 0.34,
            branchY - Math.sin(branchAngle) * length * 0.34
          );
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    const drawPetal = (f: Particle) => {
      if (f.kind === 'spark') {
        const pulse = 0.4 + 0.6 * Math.sin(t * 1.8 + f.phase);
        ctx.save();
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 207, 232, ${f.opacity * pulse})`;
        ctx.shadowColor = 'rgba(244, 114, 182, 0.6)';
        ctx.shadowBlur = f.r * 3;
        ctx.fill();
        ctx.restore();
        return;
      }
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = f.opacity;
      const grad = ctx.createLinearGradient(-f.r, -f.r, f.r, f.r);
      grad.addColorStop(0, '#fdf2f8');
      grad.addColorStop(0.55, '#f9a8d4');
      grad.addColorStop(1, '#f472b6');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -f.r);
      ctx.bezierCurveTo(f.r * 1.5, -f.r * 0.8, f.r * 1.4, f.r * 0.9, 0, f.r * 1.2);
      ctx.bezierCurveTo(-f.r * 1.4, f.r * 0.9, -f.r * 1.5, -f.r * 0.8, 0, -f.r);
      ctx.fill();
      ctx.restore();
    };

    const drawLeaf = (f: Particle) => {
      if (f.kind === 'spark') {
        const pulse = 0.4 + 0.6 * Math.sin(t * 2.2 + f.phase);
        ctx.save();
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(253, 186, 116, ${f.opacity * pulse})`;
        ctx.shadowColor = 'rgba(249, 115, 22, 0.65)';
        ctx.shadowBlur = f.r * 3;
        ctx.fill();
        ctx.restore();
        return;
      }
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = f.opacity;
      const warm = f.hue > 0.62 ? '#fbbf24' : f.hue > 0.3 ? '#fb923c' : '#f87171';
      ctx.fillStyle = warm;
      ctx.beginPath();
      ctx.moveTo(0, -f.r * 1.4);
      ctx.quadraticCurveTo(f.r * 1.15, 0, 0, f.r * 1.4);
      ctx.quadraticCurveTo(-f.r * 1.15, 0, 0, -f.r * 1.4);
      ctx.fill();
      ctx.restore();
    };

    const drawFirefly = (f: Particle) => {
      const pulse = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.4 + f.phase));
      ctx.save();
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 0.88, 0, Math.PI * 2);
      const isCyan = f.hue > 0.65;
      ctx.fillStyle = isCyan
        ? `rgba(103, 232, 249, ${f.opacity * pulse})`
        : `rgba(253, 224, 71, ${f.opacity * pulse})`;
      ctx.shadowColor = isCyan ? 'rgba(34, 211, 238, 0.8)' : 'rgba(253, 224, 71, 0.85)';
      ctx.shadowBlur = f.r * 4.5;
      ctx.fill();
      ctx.restore();
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
        if (season === 'summer' || f.kind === 'spark') {
          f.y -= f.speed * 0.32;
          f.x += Math.sin(t * f.drift + f.phase) * 0.4;
          if (f.y < -12) {
            f.y = window.innerHeight + 12;
            f.x = Math.random() * window.innerWidth;
          }
        } else {
          f.y += f.speed;
          f.x += Math.sin(t * f.drift + f.phase) * (season === 'autumn' ? 0.75 : 0.42);
          f.rot += f.rotSpeed;
        }

        if (f.y > window.innerHeight + 12) {
          f.y = -12;
          f.x = Math.random() * window.innerWidth;
        }
        if (f.x > window.innerWidth + 12) f.x = -12;
        if (f.x < -12) f.x = window.innerWidth + 12;

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
      <div className={`season-fx-aurora season-fx-aurora--${season}`} aria-hidden="true" />
      <canvas ref={canvasRef} className="season-fx-canvas" aria-hidden="true" />
    </>
  );
};

export default SeasonFx;
