'use client';

import { STAT_LABELS, type StatKey } from '@/lib/wallet-wars/fighterStats';

interface StatBarProps {
  stat: StatKey;
  value: number;
  max?: number;
  highlight?: 'win' | 'lose' | null;
  animate?: boolean;
}

export function StatBar({
  stat,
  value,
  max = 150,
  highlight = null,
  animate = false,
}: StatBarProps) {
  const segments = 10;
  const filled = Math.min(segments, Math.round((value / max) * segments));

  const highlightClass =
    highlight === 'win'
      ? 'bg-phosphor shadow-[0_0_8px_rgba(39,255,125,0.6)]'
      : highlight === 'lose'
        ? 'bg-red-600 opacity-50'
        : 'bg-cyan';

  return (
    <div className="w-full" data-stat={stat}>
      <div className="mb-1 flex items-center justify-between font-pixel text-[8px] uppercase tracking-wide text-bone/80">
        <span>{STAT_LABELS[stat]}</span>
        <span className={animate ? 'tabular-nums' : ''}>{value}</span>
      </div>
      <div className="flex gap-[3px]">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-[var(--px)] flex-1 border border-void/80 ${
              i < filled ? highlightClass : 'bg-void/60'
            }`}
            style={{ imageRendering: 'pixelated' }}
          />
        ))}
      </div>
    </div>
  );
}
