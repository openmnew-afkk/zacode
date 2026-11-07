/* ═══════════════════════════════════════════════════════════════════════════
 *  ✨ SeasonFx PRO — Кинематографичные сезонные эффекты и новогодняя магия
 *
 *  • Зима (Новогодняя) 🎄:
 *      - Праздничная гирлянда с мягким мерцанием тёплых огоньков сверху
 *      - 3D-снегопад (кристальные снежинки + мягкий пух + золотые искры боке)
 *      - Морозный иней по углам экрана
 *  • Весна 🌸 : кружащиеся 3D-лепестки сакуры + нежная розовая пыльца
 *  • Лето  🌞 : золотые светлячки и солнечные блики
 *  • Осень 🍁 : янтарные и багряные листья в тёплом ветре
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
  kind: 'crystal' | 'fluff' | 'spark';
}

const GARLAND_BULBS = Array.from({ length: 18 }, (_, i) => {
  const colors = ['gold', 'ruby', 'ice', 'emerald', 'gold', 'amber'] as const;
  return {
    id: i,
    color: colors[i % colors.length],
    delay: `${(i * 0.37) % 2.4}s`,
  };
});

const SeasonFx: React.FC<Props> = ({ season }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem('zenova_fx_off') !== '1';
    } catch {
      return true;
    }
  });

  const [garlandOn, setGarlandOn] = useState(() => {
    try {
      return localStorage.getItem('zenova_garland_off') !== '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const updateEnabled = () => {
      try {
        setEnabled(localStorage.getItem('zenova_fx_off') !== '1');
        setGarlandOn(localStorage.getItem('zenova_garland_off') !== '1');
      } catch {
        setEnabled(true);
        setGarlandOn(true);
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

    const N = season === 'winter' ? 58 : 34;
    const mk = (_: unknown, idx: number): Particle => {
      const roll = idx / N;
      const kind: Particle['kind'] =
        season === 'winter'
          ? roll < 0.42
            ? 'crystal'
            : roll < 0.84
              ? 'fluff'
              : 'spark'
          : 'crystal';

      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r:
          kind === 'spark'
            ? 2.2 + Math.random() * 3.8
            : 1.1 + Math.random() * (season === 'winter' ? 2.8 : 3.5),
        speed:
          kind === 'spark'
            ? 0.18 + Math.random() * 0.35
            : 0.35 + Math.random() * 0.85,
        drift: 0.3 + Math.random() * 0.75,
        phase: Math.random() * Math.PI * 2,
        opacity:
          kind === 'spark'
            ? 0.18 + Math.random() * 0.32
            : 0.35 + Math.random() * 0.52,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.032,
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
        const pulse = 0.45 + 0.55 * Math.sin(t * 2.1 + f.phase);
        ctx.save();
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        const isGold = f.hue > 0.35;
        ctx.fillStyle = isGold
          ? `rgba(253, 224, 138, ${f.opacity * pulse})`
          : `rgba(186, 230, 253, ${f.opacity * pulse})`;
        ctx.shadowColor = isGold ? 'rgba(251, 191, 36, 0.7)' : 'rgba(56, 189, 248, 0.7)';
        ctx.shadowBlur = f.r * 3.5;
        ctx.fill();
        ctx.restore();
        return;
      }

      if (f.kind === 'fluff') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 0.95, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(240, 249, 255, ${f.opacity * 0.88})`;
        ctx.shadowColor = 'rgba(186, 230, 253, 0.65)';
        ctx.shadowBlur = f.r * 2.2;
        ctx.fill();
        ctx.restore();
        return;
      }

      const length = f.r * 1.75;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = f.opacity;
      ctx.strokeStyle = '#f0f9ff';
      ctx.lineWidth = Math.max(0.75, f.r * 0.34);
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(125, 211, 252, 0.65)';
      ctx.shadowBlur = f.r * 1.4;
      ctx.beginPath();
      for (let arm = 0; arm < 6; arm += 1) {
        const angle = (arm * Math.PI) / 3;
        const x = Math.cos(angle) * length;
        const y = Math.sin(angle) * length;
        const branchX = x * 0.64;
        const branchY = y * 0.64;
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        for (const direction of [-1, 1]) {
          const branchAngle = angle + direction * 0.78;
          ctx.moveTo(branchX, branchY);
          ctx.lineTo(
            branchX - Math.cos(branchAngle) * length * 0.36,
            branchY - Math.sin(branchAngle) * length * 0.36
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
      grad.addColorStop(0, '#fce7f3');
      grad.addColorStop(0.6, '#f9a8d4');
      grad.addColorStop(1, '#f472b6');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, f.r * 1.65, f.r * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawLeaf = (f: Particle) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = f.opacity;
      const warm = f.hue > 0.6 ? '#fbbf24' : f.hue > 0.3 ? '#fb923c' : '#f87171';
      ctx.fillStyle = warm;
      ctx.beginPath();
      ctx.moveTo(0, -f.r * 1.45);
      ctx.quadraticCurveTo(f.r * 1.1, 0, 0, f.r * 1.45);
      ctx.quadraticCurveTo(-f.r * 1.1, 0, 0, -f.r * 1.45);
      ctx.fill();
      ctx.restore();
    };

    const drawFirefly = (f: Particle) => {
      const pulse = 0.38 + 0.62 * Math.abs(Math.sin(t * 1.5 + f.phase));
      ctx.save();
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 0.9, 0, Math.PI * 2);
      const isCyan = f.hue > 0.7;
      ctx.fillStyle = isCyan
        ? `rgba(103, 232, 249, ${f.opacity * pulse})`
        : `rgba(253, 224, 71, ${f.opacity * pulse})`;
      ctx.shadowColor = isCyan ? 'rgba(34, 211, 238, 0.85)' : 'rgba(253, 224, 71, 0.9)';
      ctx.shadowBlur = f.r * 5;
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
          f.y -= f.speed * 0.35;
          f.x += Math.sin(t * f.drift + f.phase) * 0.45;
          if (f.y < -12) {
            f.y = window.innerHeight + 12;
            f.x = Math.random() * window.innerWidth;
          }
        } else {
          f.y += f.speed;
          f.x += Math.sin(t * f.drift + f.phase) * (season === 'autumn' ? 0.82 : 0.45);
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

  if (season === 'none') return null;

  return (
    <>
      {enabled && <canvas ref={canvasRef} className="season-fx-canvas" aria-hidden="true" />}

      {/* Новогодняя гирлянда и морозное сияние */}
      {season === 'winter' && (
        <>
          {enabled && <div className="season-fx-frost" aria-hidden="true" />}
          {garlandOn && (
            <div className="season-fx-garland" aria-hidden="true">
              <div className="season-fx-garland__wire" />
              <div className="season-fx-garland__bulbs">
                {GARLAND_BULBS.map((b) => (
                  <span
                    key={b.id}
                    className={`season-fx-bulb season-fx-bulb--${b.color}`}
                    style={{ animationDelay: b.delay }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default SeasonFx;
