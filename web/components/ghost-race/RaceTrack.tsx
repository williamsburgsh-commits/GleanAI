'use client';

import { GHOST_CHAINS, ghostProgress } from '@/lib/ghost-race/ghostChains';

export function RaceTrack({
  elapsedMs,
  finished,
  solProgress,
}: {
  elapsedMs: number;
  finished: boolean;
  /** 0–1 progress for Solana car (1 = finished / confirmed). */
  solProgress: number;
}) {
  const eth = ghostProgress(elapsedMs, GHOST_CHAINS.eth.medianConfirmMs);
  const btc = ghostProgress(elapsedMs, GHOST_CHAINS.btc.medianConfirmMs);

  return (
    <div className="space-y-3">
      <Lane
        label="SOL"
        color="phosphor"
        progress={solProgress}
        finished={finished && solProgress >= 1}
      />
      <Lane label="ETH" color="cyan" progress={eth} ghost />
      <Lane label="BTC" color="magenta" progress={btc} ghost />
      <div className="flex justify-between font-term text-[10px] text-ash">
        <span>START</span>
        <span>FINISH</span>
      </div>
    </div>
  );
}

function Lane({
  label,
  color,
  progress,
  ghost,
  finished,
}: {
  label: string;
  color: 'phosphor' | 'cyan' | 'magenta';
  progress: number;
  ghost?: boolean;
  finished?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  const border =
    color === 'phosphor'
      ? 'border-phosphor/40'
      : color === 'cyan'
        ? 'border-cyan/40'
        : 'border-magenta/40';
  const car =
    color === 'phosphor'
      ? 'bg-phosphor'
      : color === 'cyan'
        ? 'bg-cyan'
        : 'bg-magenta';
  const text =
    color === 'phosphor'
      ? 'text-phosphor'
      : color === 'cyan'
        ? 'text-cyan'
        : 'text-magenta';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className={`font-pixel text-[8px] ${text}`}>
          {ghost ? `${label} GHOST` : label}
          {finished ? ' ✓' : ''}
        </span>
        <span className="font-term text-[10px] text-ash">{Math.round(pct)}%</span>
      </div>
      <div className={`relative h-8 overflow-hidden border bg-void ${border}`}>
        {/* track dashes */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent, transparent 12px, #1b2130 12px, #1b2130 14px)',
          }}
        />
        <div
          className={`absolute top-1/2 h-4 w-6 -translate-y-1/2 ${car} ${
            ghost ? 'opacity-50' : ''
          }`}
          style={{
            left: `calc(${pct}% - 1.5rem)`,
            boxShadow: finished ? '0 0 12px currentColor' : undefined,
            transition: finished ? 'none' : 'left 80ms linear',
          }}
        />
        <div className="absolute bottom-0 right-0 top-0 w-1 bg-amber/80" />
      </div>
    </div>
  );
}
