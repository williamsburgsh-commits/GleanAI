// Mirror of web/lib/levels.ts so the bot reports the same level/title as the
// Mini App. Levels are derived purely from points (no extra DB state).

export const LEVEL_TIERS = [
  { level: 1, title: 'Newcomer', minPoints: 0 },
  { level: 2, title: 'Explorer', minPoints: 100 },
  { level: 3, title: 'Trader', minPoints: 300 },
  { level: 4, title: 'Staker', minPoints: 600 },
  { level: 5, title: 'Minter', minPoints: 1000 },
  { level: 6, title: 'Degen', minPoints: 1500 },
  { level: 7, title: 'Validator', minPoints: 2200 },
  { level: 8, title: 'Solana Native', minPoints: 3000 },
  { level: 9, title: 'Ecosystem OG', minPoints: 4200 },
  { level: 10, title: 'Glean Legend', minPoints: 6000 },
];

export function getLevelProgress(points) {
  const pts = Math.max(0, Math.floor(points || 0));

  let current = LEVEL_TIERS[0];
  for (const tier of LEVEL_TIERS) {
    if (pts >= tier.minPoints) current = tier;
    else break;
  }

  const next = LEVEL_TIERS.find((t) => t.level === current.level + 1) ?? null;
  const pointsToNext = next ? next.minPoints - pts : null;

  return {
    level: current.level,
    title: current.title,
    pointsToNext,
    isMax: next === null,
  };
}
