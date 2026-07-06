'use client';

import { STAT_LABELS, type StatKey } from '@/lib/wallet-wars/fighterStats';

interface StatBarProps {
  stat: StatKey;
  value: number;
  displayValue?: number;
  max?: number;
  highlight?: 'win' | 'lose' | null;
  animate?: boolean;
  revealed?: boolean;
  active?: boolean;
  deciding?: boolean;
}

export function StatBar({
  stat,
  value,
  displayValue,
  max = 150,
  highlight = null,
  animate = false,
  revealed = true,
  active = false,
  deciding = false,
}: StatBarProps) {
  const shown = displayValue ?? value;
  const segments = 10;
  const filled = Math.min(segments, Math.round((shown / max) * segments));

  const highlightClass =
    highlight === 'win'
      ? 'bg-phosphor shadow-[0_0_8px_rgba(39,255,125,0.6)] battle-stat-win'
      : highlight === 'lose'
        ? 'bg-red-600 opacity-50 battle-stat-lose'
        : 'bg-cyan';

  return (
    <div
      className={`w-full transition-all duration-200 ${
        active ? 'battle-stat-active' : ''
      } ${deciding ? 'battle-stat-deciding' : ''}`}
      data-stat={stat}
    >
      <div className={`mb-0.5 flex items-center justify-between font-pixel uppercase tracking-wide text-bone/80 ${animate ? 'text-[6px]' : 'text-[8px]'}`}>
        <span className={active ? 'text-phosphor animate-blink' : ''}>{STAT_LABELS[stat]}</span>
        <span className={`${animate ? 'tabular-nums' : ''} ${!revealed ? 'opacity-30' : ''}`}>
          {revealed ? shown : '—'}
        </span>
      </div>
      <div className={`flex ${animate ? 'gap-[2px]' : 'gap-[3px]'}`}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`h-[var(--px)] flex-1 border border-void/80 ${
              revealed && i < filled ? highlightClass : 'bg-void/60'
            }`}
            style={{ imageRendering: 'pixelated' }}
          />
        ))}
      </div>
    </div>
  );
}
