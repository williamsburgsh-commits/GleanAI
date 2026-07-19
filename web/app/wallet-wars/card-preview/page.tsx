'use client';

import { FighterCard, type FighterCardData } from '@/components/wallet-wars/FighterCard';
import type { FighterRarity } from '@/lib/wallet-wars/rarity';
import { resolveFighterAvatar } from '@/lib/wallet-wars/avatar';
import { BOSSES } from '@/lib/wallet-wars/bosses';

/** Distinct bands so each rarity shows different gear layers. */
const MOCK: {
  rarity: FighterRarity;
  name: string;
  walletAddress: string;
  strike: number;
  shield: number;
  power: number;
  armor: number;
  agility: number;
}[] = [
  {
    rarity: 'common',
    name: 'Rook…Pilot',
    walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    strike: 25,
    shield: 20,
    power: 18,
    armor: 22,
    agility: 30,
  },
  {
    rarity: 'rare',
    name: 'Cyan…Ranger',
    walletAddress: 'DYw8jCTfwHKgo31oYAhVnXJSDpbD5jBkheTqA83TZRuJo',
    strike: 55,
    shield: 48,
    power: 42,
    armor: 50,
    agility: 60,
  },
  {
    rarity: 'epic',
    name: 'Void…Bruiser',
    walletAddress: 'HN7cABqLq46Es1jh92dQQodLSzemdN1N4TdZ4wfYHqSa',
    strike: 90,
    shield: 70,
    power: 85,
    armor: 75,
    agility: 55,
  },
  {
    rarity: 'legendary',
    name: 'Gold…Legend',
    walletAddress: 'FakeLegend11111111111111111111111111111111',
    strike: 110,
    shield: 95,
    power: 120,
    armor: 100,
    agility: 90,
  },
];

function mockFighter(m: (typeof MOCK)[number]): FighterCardData {
  const totalScore = m.strike + m.shield + m.power + m.armor + m.agility;
  return {
    name: m.name,
    walletAddress: m.walletAddress,
    avatarUrl: resolveFighterAvatar({
      walletAddress: m.walletAddress,
      strike: m.strike,
      shield: m.shield,
      power: m.power,
      armor: m.armor,
      agility: m.agility,
      rarity: m.rarity,
    }),
    strike: m.strike,
    shield: m.shield,
    power: m.power,
    armor: m.armor,
    agility: m.agility,
    totalScore,
    rarity: m.rarity,
    questBonus: { shield: 10, power: 0, strike: 15, armor: 12, agility: 5 },
  };
}

function tolyMock(): FighterCardData {
  const wallet = BOSSES.toly.walletAddress!;
  const s = BOSSES.toly.statFloor;
  return {
    name: BOSSES.toly.name,
    walletAddress: wallet,
    avatarUrl: resolveFighterAvatar({
      walletAddress: wallet,
      ...s,
      rarity: 'legendary',
    }),
    ...s,
    totalScore: s.strike + s.shield + s.power + s.armor + s.agility,
    rarity: 'legendary',
  };
}

export default function CardPreviewPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 font-pixel text-sm text-phosphor">FIGHTER CARD PREVIEW</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {MOCK.map((m) => (
          <FighterCard key={m.rarity} fighter={mockFighter(m)} variant="profile" />
        ))}
      </div>
      <h2 className="mb-4 mt-10 font-pixel text-xs text-amber">KOL 1:1 (TOLY)</h2>
      <div className="max-w-[280px]">
        <FighterCard fighter={tolyMock()} variant="profile" />
      </div>
    </main>
  );
}
