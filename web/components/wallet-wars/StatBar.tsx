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

  const textSize = animate ? 'text-[5px]' : 'text-[7px]';
  const gridCols = animate
    ? 'grid-cols-[2.5rem_1fr_1.25rem]'
    : 'grid-cols-[3.25rem_1fr_1.5rem]';
  const gapX = animate ? 'gap-x-1' : 'gap-x-1.5';
  const barGap = animate ? 'gap-px' : 'gap-[2px]';
  const barH = animate ? 'h-[3px]' : 'h-[var(--px)]';

  return (
    <div
      className={`grid w-full items-center transition-all duration-200 ${gridCols} ${gapX} ${
        active ? 'battle-stat-active' : ''
      } ${deciding ? 'battle-stat-deciding' : ''}`}
      data-stat={stat}
    >
      <span
        className={`truncate font-pixel uppercase tracking-wide text-bone/80 ${textSize} ${
          active ? 'text-phosphor animate-blink' : ''
        }`}
      >
        {STAT_LABELS[stat]}
      </span>
      <div className={`flex min-w-0 ${barGap}`}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`${barH} flex-1 border border-void/80 ${
              revealed && i < filled ? highlightClass : 'bg-void/60'
            }`}
            style={{ imageRendering: 'pixelated' }}
          />
        ))}
      </div>
      <span
        className={`text-right font-pixel tabular-nums text-bone/80 ${textSize} ${
          !revealed ? 'opacity-30' : ''
        }`}
      >
        {revealed ? shown : '—'}
      </span>
    </div>
  );
}
