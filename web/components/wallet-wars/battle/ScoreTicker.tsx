'use client';

export function CardScoreBadge({
  wins,
  tone = 'phosphor',
}: {
  wins: number;
  tone?: 'phosphor' | 'magenta';
}) {
  return (
    <div
      className={`absolute -top-2 left-1/2 z-20 -translate-x-1/2 font-pixel text-[8px] ${
        tone === 'phosphor' ? 'text-phosphor' : 'text-magenta'
      }`}
    >
      {wins}
    </div>
  );
}
