import { metricsToBaseStats, totalScore, type BaseStats } from './fighterStats';
import { scoreToRarity } from './rarity';
import { botAvatarUrl, resolveFighterAvatar } from './avatar';
import type { FighterSnapshot } from './battleResolver';
import type { FighterRarity } from './rarity';

export type BotDifficulty = 'easy' | 'normal' | 'hard';

const BOT_NAMES = [
  'Rust Byte',
  'Phantom Claw',
  'Stake Lord',
  'Jupiter Jack',
  'SOL Reaper',
  'Metaplex Mike',
  'Degen Duke',
  'Validator Vex',
];

const SCALE: Record<BotDifficulty, [number, number]> = {
  easy: [0.75, 0.9],
  normal: [0.9, 1.05],
  hard: [1.05, 1.2],
};

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function scaleStats(base: BaseStats, factor: number): BaseStats {
  return {
    strike: Math.round(base.strike * factor),
    shield: Math.round(base.shield * factor),
    power: Math.round(base.power * factor),
    armor: Math.round(base.armor * factor),
    agility: Math.round(base.agility * factor),
  };
}

export function createBotFighter(
  playerStats: BaseStats,
  playerTotal: number,
  difficulty: BotDifficulty = 'normal',
  seed?: string
): FighterSnapshot {
  const botSeed = seed ?? `bot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const rand = seededRandom(botSeed);
  const [lo, hi] = SCALE[difficulty];
  const factor = lo + rand() * (hi - lo);

  const avg = playerTotal / 5;
  const synthetic = metricsToBaseStats({
    balanceLamports: avg * 1e8,
    walletAgeDays: Math.round(avg / 2),
    totalTxCount: Math.round(avg),
    uniquePrograms: Math.round(avg / 5),
    recentSwapCount: Math.round(avg / 10),
    nftActionCount: Math.round(avg / 15),
    txsLast14Days: Math.round(avg / 4),
    stakeActionCount: Math.round(avg / 12),
    firstTxTimestamp: null,
  });

  const stats = scaleStats(
    {
      strike: Math.max(synthetic.strike, Math.round(playerStats.strike * factor)),
      shield: Math.max(synthetic.shield, Math.round(playerStats.shield * factor)),
      power: Math.max(synthetic.power, Math.round(playerStats.power * factor)),
      armor: Math.max(synthetic.armor, Math.round(playerStats.armor * factor)),
      agility: Math.max(synthetic.agility, Math.round(playerStats.agility * factor)),
    },
    1
  );

  const nameIdx = Math.floor(rand() * BOT_NAMES.length);
  const total = totalScore(stats);
  const rarity = scoreToRarity(total);

  return {
    name: BOT_NAMES[nameIdx] ?? 'Bot Fighter',
    avatarUrl: botAvatarUrl({ ...stats, rarity }),
    stats,
    totalScore: total,
    rarity,
    isBot: true,
  };
}

export function fighterRowToSnapshot(
  row: {
    wallet_address: string;
    shield: number;
    power: number;
    strike: number;
    armor?: number;
    agility: number;
    total_score: number;
    rarity: string;
    avatar_url: string;
    id?: string;
  },
  displayName?: string
): FighterSnapshot {
  const armor = row.armor ?? 0;
  const rarity = row.rarity as FighterRarity;
  return {
    id: row.id,
    name: displayName ?? shorten(row.wallet_address),
    walletAddress: row.wallet_address,
    avatarUrl: resolveFighterAvatar({
      walletAddress: row.wallet_address,
      strike: row.strike,
      shield: row.shield,
      power: row.power,
      armor,
      agility: row.agility,
      rarity,
    }),
    stats: {
      strike: row.strike,
      shield: row.shield,
      power: row.power,
      armor,
      agility: row.agility,
    },
    totalScore: row.total_score,
    rarity: row.rarity,
    isBot: false,
  };
}

function shorten(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
