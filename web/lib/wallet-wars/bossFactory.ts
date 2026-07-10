import { fetchWalletMetrics } from '@/lib/wallet-wars/metrics';
import { metricsToBaseStats, totalScore, type BaseStats } from '@/lib/wallet-wars/fighterStats';
import { scoreToRarity } from '@/lib/wallet-wars/rarity';
import { bossAvatarUrl } from '@/lib/wallet-wars/bossAvatar';
import { createBotFighter, type BotDifficulty } from '@/lib/wallet-wars/botFactory';
import type { FighterSnapshot } from '@/lib/wallet-wars/battleResolver';
import {
  getBossDefinition,
  type BossDefinition,
  type BossSlug,
} from '@/lib/wallet-wars/bosses';

const CACHE_TTL_MS = 60 * 60 * 1000;
const snapshotCache = new Map<string, { at: number; snapshot: FighterSnapshot }>();

function mergeWithFloor(stats: BaseStats, floor: BaseStats): BaseStats {
  return {
    strike: Math.max(stats.strike, floor.strike),
    shield: Math.max(stats.shield, floor.shield),
    power: Math.max(stats.power, floor.power),
    armor: Math.max(stats.armor, floor.armor),
    agility: Math.max(stats.agility, floor.agility),
  };
}

function clampStats(stats: BaseStats): BaseStats {
  const cap = (n: number) => Math.min(120, Math.max(0, Math.round(n)));
  return {
    strike: cap(stats.strike),
    shield: cap(stats.shield),
    power: cap(stats.power),
    armor: cap(stats.armor),
    agility: cap(stats.agility),
  };
}

function definitionToSnapshot(boss: BossDefinition, stats: BaseStats): FighterSnapshot {
  const merged = clampStats(mergeWithFloor(stats, boss.statFloor));
  const total = totalScore(merged);
  const rarity = boss.rarity === 'legendary' || boss.rarity === 'epic'
    ? boss.rarity
    : scoreToRarity(total);

  return {
    name: boss.name,
    walletAddress: boss.walletAddress ?? undefined,
    avatarUrl: bossAvatarUrl(boss.slug),
    stats: merged,
    totalScore: total,
    rarity,
    isBot: Boolean(boss.synthetic),
  };
}

async function scanWalletBoss(boss: BossDefinition): Promise<FighterSnapshot> {
  if (!boss.walletAddress) {
    throw new Error(`Boss ${boss.slug} has no wallet address.`);
  }

  const cached = snapshotCache.get(boss.slug);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ...cached.snapshot, avatarUrl: bossAvatarUrl(boss.slug) };
  }

  const metrics = await fetchWalletMetrics(boss.walletAddress);
  const base = metricsToBaseStats(metrics);
  const snapshot = definitionToSnapshot(boss, base);
  snapshotCache.set(boss.slug, { at: Date.now(), snapshot });
  return snapshot;
}

function buildSyntheticGatekeeper(
  boss: BossDefinition,
  challengerStats: BaseStats,
  challengerTotal: number
): FighterSnapshot {
  const bot = createBotFighter(challengerStats, challengerTotal, 'easy' as BotDifficulty, `boss-${boss.slug}`);
  const merged = clampStats(mergeWithFloor(bot.stats, boss.statFloor));
  const total = totalScore(merged);
  return {
    name: boss.name,
    avatarUrl: bossAvatarUrl(boss.slug),
    stats: merged,
    totalScore: total,
    rarity: boss.rarity,
    isBot: true,
  };
}

export async function buildBossSnapshot(
  slug: BossSlug,
  challengerStats?: BaseStats,
  challengerTotal?: number
): Promise<{ snapshot: FighterSnapshot; definition: BossDefinition }> {
  const boss = getBossDefinition(slug);
  if (!boss) throw new Error('Unknown boss.');

  if (boss.synthetic) {
    if (!challengerStats || challengerTotal === undefined) {
      throw new Error('Challenger stats required for synthetic boss.');
    }
    return {
      definition: boss,
      snapshot: buildSyntheticGatekeeper(boss, challengerStats, challengerTotal),
    };
  }

  const snapshot = await scanWalletBoss(boss);
  return { definition: boss, snapshot };
}

export function invalidateBossSnapshotCache(slug?: BossSlug): void {
  if (slug) snapshotCache.delete(slug);
  else snapshotCache.clear();
}
