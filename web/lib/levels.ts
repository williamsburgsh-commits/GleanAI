// ---------------------------------------------------------------------------
// GleanAI leveling system. Levels are derived purely from points so they stay
// consistent everywhere (bot, web, Mini App) with no extra DB state. As users
// earn points (quests, sprint, referrals, future staking) they level up and
// unlock new titles.
// ---------------------------------------------------------------------------

export interface LevelTier {
  level: number;
  title: string;
  minPoints: number;
}

// Thresholds are cumulative points required to *reach* the level.
export const LEVEL_TIERS: LevelTier[] = [
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

export interface LevelProgress {
  level: number;
  title: string;
  current: LevelTier;
  next: LevelTier | null;
  pointsIntoLevel: number;
  pointsForNext: number | null; // points span between current and next tier
  pointsToNext: number | null; // remaining points until next level
  progressPct: number; // 0-100 progress toward next level (100 if maxed)
  isMax: boolean;
}

export function getLevelProgress(points: number): LevelProgress {
  const pts = Math.max(0, Math.floor(points || 0));

  let current = LEVEL_TIERS[0];
  for (const tier of LEVEL_TIERS) {
    if (pts >= tier.minPoints) current = tier;
    else break;
  }

  const next =
    LEVEL_TIERS.find((t) => t.level === current.level + 1) ?? null;

  const pointsIntoLevel = pts - current.minPoints;
  const pointsForNext = next ? next.minPoints - current.minPoints : null;
  const pointsToNext = next ? next.minPoints - pts : null;
  const progressPct = next
    ? Math.min(100, Math.round((pointsIntoLevel / (pointsForNext || 1)) * 100))
    : 100;

  return {
    level: current.level,
    title: current.title,
    current,
    next,
    pointsIntoLevel,
    pointsForNext,
    pointsToNext,
    progressPct,
    isMax: next === null,
  };
}

export function getLevelTitle(points: number): string {
  return getLevelProgress(points).title;
}
