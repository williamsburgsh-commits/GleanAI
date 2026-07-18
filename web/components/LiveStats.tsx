'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { palette } from '@/lib/palette';

interface StatsPayload {
  walletsConnected: number;
  questsCompleted: number;
  avgTxFee: string;
}

const POLL_MS = 30_000;
const COUNT_MS = 1500;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(target: number, active: boolean, durationMs = COUNT_MS) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const from = fromRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const next = Math.round(from + (target - from) * easeOutCubic(t));
      setValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, active, durationMs]);

  return value;
}

function StatCell({
  value,
  label,
  display,
}: {
  value: number;
  label: string;
  display?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-3 py-4 text-center">
      <div className="font-pixel text-[16px] leading-none text-phosphor glow-text sm:text-[20px]">
        {display ?? value.toLocaleString()}
      </div>
      <div className="mt-3 font-pixel text-[7px] uppercase leading-snug tracking-[0.14em] text-mute sm:text-[8px]">
        {label}
      </div>
    </div>
  );
}

export function LiveStats() {
  const rootRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [stats, setStats] = useState<StatsPayload>({
    walletsConnected: 0,
    questsCompleted: 0,
    avgTxFee: '< $0.001',
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/stats', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as StatsPayload;
      setStats({
        walletsConnected: Number(data.walletsConnected) || 0,
        questsCompleted: Number(data.questsCompleted) || 0,
        avgTxFee: data.avgTxFee || '< $0.001',
      });
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const wallets = useCountUp(stats.walletsConnected, inView);
  const quests = useCountUp(stats.questsCompleted, inView);

  return (
    <div
      ref={rootRef}
      className={`scanlines crt-panel live-stats-panel bg-void ${inView ? 'is-live' : ''}`}
      style={{ borderColor: palette.phosphor }}
    >
      <div
        className="relative flex items-center justify-end border-b-2 border-phosphor/25 px-3 py-2"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0))',
        }}
      >
        <span className="mr-auto font-term text-[14px] uppercase tracking-[0.2em] text-mute">
          cabinet feed
        </span>
        <span className="flex items-center gap-1.5">
          <i
            className="h-1.5 w-1.5 animate-blink bg-phosphor"
            style={{ boxShadow: '0 0 4px currentColor' }}
          />
          <i className="h-1.5 w-1.5 bg-grid" />
          <i className="h-1.5 w-1.5 bg-grid" />
        </span>
      </div>

      <div className="flex flex-col sm:flex-row">
        <StatCell value={wallets} label="Wallets connected" />
        <div className="hidden w-px self-stretch bg-phosphor/20 sm:block" aria-hidden />
        <div className="h-px w-full bg-phosphor/20 sm:hidden" aria-hidden />
        <StatCell value={quests} label="Quests completed" />
        <div className="hidden w-px self-stretch bg-phosphor/20 sm:block" aria-hidden />
        <div className="h-px w-full bg-phosphor/20 sm:hidden" aria-hidden />
        <StatCell
          value={0}
          label="Avg tx fee on Solana"
          display={inView ? stats.avgTxFee : '—'}
        />
      </div>
    </div>
  );
}
