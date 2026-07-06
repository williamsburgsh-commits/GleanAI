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
