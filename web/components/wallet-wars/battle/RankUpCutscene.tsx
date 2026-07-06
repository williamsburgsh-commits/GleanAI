'use client';

interface RankUpCutsceneProps {
  title: string;
  visible: boolean;
  onDone: () => void;
}

export function RankUpCutscene({ title, visible, onDone }: RankUpCutsceneProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-void/90"
      onAnimationEnd={() => setTimeout(onDone, 800)}
    >
      <div className="battle-rank-up text-center">
        <p className="font-pixel text-[10px] text-amber">RANK UP!</p>
        <p className="mt-4 font-pixel text-lg text-phosphor glow-text">{title.toUpperCase()}</p>
        <p className="mt-2 font-term text-bone/70">Your fighter evolves...</p>
      </div>
    </div>
  );
}
