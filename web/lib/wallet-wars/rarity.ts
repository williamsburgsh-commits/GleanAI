export type FighterRarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_THRESHOLDS: { min: number; rarity: FighterRarity }[] = [
  { min: 400, rarity: 'legendary' },
  { min: 250, rarity: 'epic' },
  { min: 120, rarity: 'rare' },
  { min: 0, rarity: 'common' },
];

export function scoreToRarity(totalScore: number): FighterRarity {
  for (const t of RARITY_THRESHOLDS) {
    if (totalScore >= t.min) return t.rarity;
  }
  return 'common';
}

export function rarityLabel(rarity: FighterRarity): string {
  return rarity.toUpperCase();
}

export function rarityBorderClass(rarity: FighterRarity): string {
  switch (rarity) {
    case 'legendary':
      return 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]';
    case 'epic':
      return 'border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)]';
    case 'rare':
      return 'border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.35)]';
    default:
      return 'border-zinc-500';
  }
}

/** Outer frame border + glow + rarity-tinted fill for the Arcade TCG shell. */
export function rarityFrameClass(rarity: FighterRarity): string {
  switch (rarity) {
    case 'legendary':
      return 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)] bg-[#1a1408]';
    case 'epic':
      return 'border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)] bg-[#140a1c]';
    case 'rare':
      return 'border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.35)] bg-[#081418]';
    default:
      return 'border-zinc-500 bg-[#0d1219]';
  }
}

/** Compact rarity gem / chip on the nameplate. */
export function rarityGemClass(rarity: FighterRarity): string {
  switch (rarity) {
    case 'legendary':
      return 'border-amber-400 bg-amber-400/15 text-amber-300';
    case 'epic':
      return 'border-purple-400 bg-purple-500/15 text-purple-300';
    case 'rare':
      return 'border-cyan-400 bg-cyan-500/15 text-cyan-300';
    default:
      return 'border-zinc-500 bg-zinc-500/15 text-zinc-300';
  }
}
