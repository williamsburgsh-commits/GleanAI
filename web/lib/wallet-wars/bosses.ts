import type { BaseStats } from './fighterStats';
import type { FighterRarity } from './rarity';

export type BossTier = 'common' | 'rare' | 'epic' | 'legendary';

export interface BossDefinition {
  slug: string;
  name: string;
  title: string;
  tier: BossTier;
  /** null = synthetic gatekeeper bot */
  walletAddress: string | null;
  solscanUrl: string | null;
  introLine: string;
  tauntPool: string[];
  statFloor: BaseStats;
  rarity: FighterRarity;
  /** Bonus points on win (legendary bosses) */
  winBonus?: number;
  synthetic?: boolean;
}

export const BOSS_ORDER = [
  'gatekeeper',
  'degen-duke',
  'nft-phantom',
  'ansem',
  'jupiter-jack',
  'validator-vex',
  'toly',
] as const;

export type BossSlug = (typeof BOSS_ORDER)[number];

export const BOSSES: Record<BossSlug, BossDefinition> = {
  gatekeeper: {
    slug: 'gatekeeper',
    name: 'The Gatekeeper',
    title: 'Gauntlet Warden',
    tier: 'common',
    walletAddress: null,
    solscanUrl: null,
    introLine: 'Prove your wallet belongs in the arena.',
    tauntPool: [
      'First boss, last warning.',
      'Warm up before the legends arrive.',
      'Your tx history looks thin.',
    ],
    statFloor: { strike: 15, shield: 15, power: 15, armor: 10, agility: 15 },
    rarity: 'common',
    synthetic: true,
  },
  'degen-duke': {
    slug: 'degen-duke',
    name: 'Degen Duke',
    title: 'Memecoin Marauder',
    tier: 'rare',
    walletAddress: '2QZGZa2F8JqiMDK7zCyKkrp5ECWoJtnJn4B3W4SkBXJ',
    solscanUrl: 'https://solscan.io/account/2QZGZa2F8JqiMDK7zCyKkrp5ECWoJtnJn4B3W4SkBXJ',
    introLine: 'I ape before I read the whitepaper.',
    tauntPool: [
      'NGMI energy detected.',
      'My bags are older than your strategy.',
      'Swap first, think never.',
    ],
    statFloor: { strike: 28, shield: 22, power: 30, armor: 18, agility: 32 },
    rarity: 'rare',
  },
  'nft-phantom': {
    slug: 'nft-phantom',
    name: 'NFT Phantom',
    title: 'Collector Shade',
    tier: 'rare',
    walletAddress: 'DD3AiBi6D498zC6YRoKTw17hdH5FLnfmWMQ9AVVsEf6v',
    solscanUrl: 'https://solscan.io/account/DD3AiBi6D498zC6YRoKTw17hdH5FLnfmWMQ9AVVsEf6v',
    introLine: 'Metadata is forever. Your stats are not.',
    tauntPool: [
      'Floor price > your power level.',
      'I minted before you had a wallet.',
      'JPEGs hit harder than jpegs of your stats.',
    ],
    statFloor: { strike: 32, shield: 28, power: 35, armor: 25, agility: 30 },
    rarity: 'rare',
  },
  ansem: {
    slug: 'ansem',
    name: 'Ansem',
    title: 'The Black Bull',
    tier: 'epic',
    walletAddress: 'GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52',
    solscanUrl: 'https://solscan.io/account/GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52',
    introLine: 'Solana season never ended for me.',
    tauntPool: [
      'Your wallet is newer than my shoes.',
      'CT called this fight before you loaded.',
      'Bull market mentality. Bear market stats.',
    ],
    statFloor: { strike: 45, shield: 40, power: 48, armor: 35, agility: 50 },
    rarity: 'epic',
    winBonus: 3,
  },
  'jupiter-jack': {
    slug: 'jupiter-jack',
    name: 'Jupiter Jack',
    title: 'Route Runner',
    tier: 'epic',
    walletAddress: '5oHvhDRjN56RDn59T4bFEu9ineqBpDrRsr4z7R4n3j93',
    solscanUrl: 'https://solscan.io/account/5oHvhDRjN56RDn59T4bFEu9ineqBpDrRsr4z7R4n3j93',
    introLine: 'Best route? Straight through your shield.',
    tauntPool: [
      'Routed your defense to zero.',
      'Slippage on your ego: 100%.',
      'I swap faster than you think.',
    ],
    statFloor: { strike: 50, shield: 42, power: 52, armor: 40, agility: 55 },
    rarity: 'epic',
    winBonus: 3,
  },
  'validator-vex': {
    slug: 'validator-vex',
    name: 'Validator Vex',
    title: 'Stake Sovereign',
    tier: 'legendary',
    walletAddress: '5XZwbrgWaPW1VYw2b36KupKXdE2GHWR4hjKn5QMj45b',
    solscanUrl: 'https://solscan.io/account/5XZwbrgWaPW1VYw2b36KupKXdE2GHWR4hjKn5QMj45b',
    introLine: 'Epoch after epoch, I outlast degens.',
    tauntPool: [
      'Your uptime is a joke.',
      'Staked SOL hits different.',
      'Consensus: you lose.',
    ],
    statFloor: { strike: 55, shield: 65, power: 58, armor: 60, agility: 48 },
    rarity: 'legendary',
    winBonus: 5,
  },
  toly: {
    slug: 'toly',
    name: 'Toly',
    title: 'Solana Architect',
    tier: 'legendary',
    walletAddress: '9QgXqAuGSJQCvBtXnqnQ7p1cmLDy3KdA6aaCX9obX5XN',
    solscanUrl: 'https://solscan.io/account/9QgXqAuGSJQCvBtXnqnQ7p1cmLDy3KdA6aaCX9obX5XN',
    introLine: 'Built the chain you are fighting on.',
    tauntPool: [
      'Ship faster or get rekt.',
      'The network is my shield.',
      'Final boss. No soft forks.',
    ],
    statFloor: { strike: 70, shield: 75, power: 80, armor: 72, agility: 65 },
    rarity: 'legendary',
    winBonus: 10,
  },
};

export function getBossDefinition(slug: string): BossDefinition | null {
  if (slug in BOSSES) return BOSSES[slug as BossSlug];
  return null;
}

export function isBossSlug(slug: string): slug is BossSlug {
  return BOSS_ORDER.includes(slug as BossSlug);
}

export function nextBossSlug(defeated: string[]): BossSlug | null {
  for (const slug of BOSS_ORDER) {
    if (!defeated.includes(slug)) return slug;
  }
  return null;
}

export function randomBossTaunt(boss: BossDefinition): string {
  const pool = boss.tauntPool;
  return pool[Math.floor(Math.random() * pool.length)] ?? boss.introLine;
}
