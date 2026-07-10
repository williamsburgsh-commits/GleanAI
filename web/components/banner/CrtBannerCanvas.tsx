'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  animatedBannerFrame,
  BANNER_HEIGHT,
  BANNER_WIDTH,
  drawCrtBanner,
  ensureBannerFonts,
  staticBannerFrame,
} from '@/lib/banner/drawCrtBanner';

export function CrtBannerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [ready, setReady] = useState(false);

  const paint = useCallback((frame: Parameters<typeof drawCrtBanner>[1]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCrtBanner(ctx, frame);
  }, []);

  useEffect(() => {
    let cancelled = false;

    ensureBannerFonts()
      .then(() => {
        if (cancelled) return;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const tick = (now: number) => {
      paint(animatedBannerFrame(now));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paint, ready]);

  const downloadPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    paint(staticBannerFrame());

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'gleanai-banner.png';
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');

    requestAnimationFrame((now) => paint(animatedBannerFrame(now)));
  }, [paint]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="w-full overflow-hidden border-2 border-grid bg-black"
        style={{ maxWidth: BANNER_WIDTH }}
      >
        <canvas
          ref={canvasRef}
          width={BANNER_WIDTH}
          height={BANNER_HEIGHT}
          className="block h-auto w-full"
          style={{ imageRendering: 'pixelated' }}
          aria-label="GleanAI CRT banner preview at 1500 by 500 pixels"
        />
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <button
          type="button"
          onClick={downloadPng}
          disabled={!ready}
          className="border-2 border-phosphor bg-void px-6 py-3 font-pixel text-[10px] uppercase tracking-wider text-phosphor transition hover:bg-screen disabled:opacity-40"
        >
          Download PNG (1500×500)
        </button>
        <p className="max-w-lg font-term text-[16px] text-ash">
          Preview shows the blinking cursor and drifting scanline. The exported PNG is a
          single static frame — scanlines and vignette only.
        </p>
      </div>
    </div>
  );
}
