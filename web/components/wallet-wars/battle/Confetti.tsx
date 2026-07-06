'use client';

import { useEffect, useRef } from 'react';

export function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = (canvas.width = canvas.offsetWidth * 2);
    const h = (canvas.height = canvas.offsetHeight * 2);
    ctx.scale(2, 2);

    const colors = ['#9945FF', '#14F195', '#27ff7d', '#ffb437', '#ff3da6'];
    const pieces = Array.from({ length: 60 }, () => ({
      x: Math.random() * w * 0.5,
      y: -10 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      size: 3 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
    }));

    let frame = 0;
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        ctx.fillStyle = p.color ?? '#9945FF';
        ctx.save();
        ctx.translate(p.x / 2, p.y / 2);
        ctx.rotate((p.rot + frame) * 0.02);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      frame += 1;
      if (frame < 120) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-50 h-full w-full"
      aria-hidden
    />
  );
}
