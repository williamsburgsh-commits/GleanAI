import type { WalletMetrics } from './metrics';
import { scoreToRarity, type FighterRarity } from './rarity';
import {
  computeQuestBonus,
  hasRarityBumpQuest,
  type QuestBonus,
} from './questBoosts';
import { fighterAvatarUrl } from './avatar';

export interface BaseStats {
  shield: number;
  power: number;
  strike: number;
  agility: number;
}

export interface FighterStats extends BaseStats {
  totalScore: number;
  rarity: FighterRarity;
  questBonus: QuestBonus;
  avatarUrl: string;
}

function clamp(n: number, max: number): number {
  return Math.min(Math.max(0, Math.round(n)), max);
}

export function metricsToBaseStats(metrics: WalletMetrics): BaseStats {
  const balanceSol = metrics.balanceLamports / 1e9;
  const shield = clamp(
    balanceSol * 8 + metrics.walletAgeDays * 0.5 + metrics.stakeActionCount * 12,
    120
  );
  const power = clamp(
    metrics.totalTxCount * 1.2 + metrics.uniquePrograms * 5 + metrics.nftActionCount * 8,
    120
  );
  const strike = clamp(metrics.recentSwapCount * 15 + metrics.nftActionCount * 6, 120);
  const agility = clamp(metrics.txsLast14Days * 4 + metrics.uniquePrograms * 2, 120);
  return { shield, power, strike, agility };
}

export function applyQuestBonus(base: BaseStats, bonus: QuestBonus): BaseStats {
  return {
    shield: base.shield + bonus.shield,
    power: base.power + bonus.power,
    strike: base.strike + bonus.strike,
    agility: base.agility + bonus.agility,
  };
}

export function totalScore(stats: BaseStats): number {
  return stats.shield + stats.power + stats.strike + stats.agility;
}

export function buildFighterStats(
  walletAddress: string,
  metrics: WalletMetrics,
  completedQuestSlugs: Set<string>
): FighterStats {
  const base = metricsToBaseStats(metrics);
  const questBonus = computeQuestBonus(completedQuestSlugs);
  const combined = applyQuestBonus(base, questBonus);
  let total = totalScore(combined);
  let rarity = scoreToRarity(total);

  if (hasRarityBumpQuest(completedQuestSlugs) && rarity === 'common') {
    rarity = 'rare';
  }
  if (completedQuestSlugs.has('mint-fighter-badge') && rarity !== 'legendary') {
    rarity = rarity === 'epic' ? 'legendary' : 'epic';
    total += 20;
  }

  return {
    ...combined,
    totalScore: total,
    rarity,
    questBonus,
    avatarUrl: fighterAvatarUrl(walletAddress),
  };
}

export const STAT_KEYS = ['shield', 'power', 'strike', 'agility'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  shield: 'SHIELD',
  power: 'POWER',
  strike: 'STRIKE',
  agility: 'AGILITY',
};
