/* ═══════════════════════════════════════════════════════════════════════════
 *  ✨ SeasonFx — Фирменная сезонная атмосфера ZENOVA
 *  Каждый сезон обладает уникальной авторской фишкой:
 *  ❄️ Зима: 6-лучевые ледяные снежинки-кристаллы + игольчатый морозный градиент
 *  🌸 Весна: парящие и кружащиеся лепестки Сакуры
 *  ✨ Лето: мерцающие биолюминесцентные светлячки с пульсирующим ореолом
 *  🍁 Осень: порхающие золотисто-багряные кленовые листья
 * ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState } from 'react';
import './SeasonFx.css';

type FxSeason = 'winter' | 'spring' | 'summer' | 'autumn' | 'none';

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

const AUTUMN_PALETTE = [
  '245, 158, 11',  // amber
  '234, 88, 12',   // orange-red
  '220, 38, 38',   // crimson
  '217, 119, 6',   // dark gold
];

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

    // 18 оптимизированных авторских частиц — нулевая нагрузка на телефон
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

    let lastTime = 0;
    let t = 0;

    const loop = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      // 30fps throttle для абсолютной плавности интерфейса на любых устройствах
      if (now - lastTime < 33) return;
      lastTime = now;
      t += 0.035;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < N; i++) {
        const p = parts[i];
        p.angle += p.spin;

        /* Физика движения в зависимости от сезона */
        if (season === 'summer') {
          // Светлячки медленно парят вверх и блуждают в воздухе
          p.y -= p.speed * 0.55;
          p.x += Math.sin(t * p.drift + p.phase) * 0.65;
          if (p.y < -12) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
        } else if (season === 'spring') {
          // Сакура кружится по диагонали с порывами весеннего ветра
          p.y += p.speed * 0.75;
          p.x += (Math.sin(t * p.drift + p.phase) + 0.4) * 0.85;
          if (p.y > height + 14) {
            p.y = -12;
            p.x = Math.random() * width;
          }
        } else if (season === 'autumn') {
          // Листья кружатся и планируют из стороны в сторону
          p.y += p.speed * 0.9;
          p.x += Math.sin(t * p.drift + p.phase) * 1.35;
          if (p.y > height + 16) {
            p.y = -14;
            p.x = Math.random() * width;
          }
        } else {
          // Зима: Снежинки мягко падают с лёгким покачиванием
          p.y += p.speed;
          p.x += Math.sin(t * p.drift + p.phase) * 0.5;
          if (p.y > height + 14) {
            p.y = -12;
            p.x = Math.random() * width;
          }
        }

        /* Отрисовка фирменной формы для каждого сезона */
        if (season === 'winter') {
          // ❄️ 6-лучевая кристаллическая снежинка
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.strokeStyle = `rgba(224, 242, 254, ${p.opacity * 0.85})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -p.r);
            ctx.moveTo(0, -p.r * 0.55);
            ctx.lineTo(-p.r * 0.28, -p.r * 0.82);
            ctx.moveTo(0, -p.r * 0.55);
            ctx.lineTo(p.r * 0.28, -p.r * 0.82);
            ctx.rotate(Math.PI / 3);
          }
          ctx.stroke();
          // Центральная ледяная искра
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.9})`;
          ctx.beginPath();
          ctx.arc(0, 0, 1.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (season === 'spring') {
          // 🌸 Кружащийся лепесток сакуры
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = `rgba(251, 182, 206, ${p.opacity * 0.75})`;
          ctx.beginPath();
          ctx.moveTo(0, -p.r);
          ctx.bezierCurveTo(p.r * 0.85, -p.r * 0.45, p.r * 0.75, p.r * 0.7, 0, p.r);
          ctx.bezierCurveTo(-p.r * 0.75, p.r * 0.7, -p.r * 0.85, -p.r * 0.45, 0, -p.r);
          ctx.fill();
          ctx.restore();
        } else if (season === 'summer') {
          // ✨ Биолюминесцентный светлячок с пульсирующим свечением
          const pulse = 0.55 + 0.45 * Math.sin(t * 3.5 + p.phase);
          const curAlpha = p.opacity * pulse;
          // Внешний тёплый изумрудно-золотой ореол
          ctx.fillStyle = `rgba(190, 242, 100, ${curAlpha * 0.28})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 2.8, 0, Math.PI * 2);
          ctx.fill();
          // Яркое белое ядро
          ctx.fillStyle = `rgba(255, 255, 220, ${Math.min(1, curAlpha * 1.6)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.75, 0, Math.PI * 2);
          ctx.fill();
        } else if (season === 'autumn') {
          // 🍁 Порхающий кленовый/осенний лист
          const leafColor = AUTUMN_PALETTE[p.colorIdx || 0];
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillStyle = `rgba(${leafColor}, ${p.opacity * 0.82})`;
          ctx.beginPath();
          ctx.moveTo(0, -p.r * 1.15);
          ctx.quadraticCurveTo(p.r * 0.85, -p.r * 0.2, 0, p.r * 1.15);
          ctx.quadraticCurveTo(-p.r * 0.85, -p.r * 0.2, 0, -p.r * 1.15);
          ctx.fill();
          // Центральная прожилка листа
          ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.35})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(0, -p.r * 0.85);
          ctx.lineTo(0, p.r * 0.85);
          ctx.stroke();
          ctx.restore();
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

export default React.memo(SeasonFx);
