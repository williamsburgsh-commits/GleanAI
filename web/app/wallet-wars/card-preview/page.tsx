'use client';

import { FighterCard, type FighterCardData } from '@/components/wallet-wars/FighterCard';
import type { FighterRarity } from '@/lib/wallet-wars/rarity';

const MOCK: { rarity: FighterRarity; score: number }[] = [
  { rarity: 'common', score: 80 },
  { rarity: 'rare', score: 150 },
  { rarity: 'epic', score: 280 },
  { rarity: 'legendary', score: 450 },
];

function mockFighter(rarity: FighterRarity, score: number): FighterCardData {
  const q = Math.floor(score / 5);
  return {
    name: 'Demo…Fighter',
    avatarUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${rarity}`,
    strike: q,
    shield: q,
    power: q,
    armor: q,
    agility: score - q * 4,
    totalScore: score,
    rarity,
    questBonus: { shield: 10, power: 0, strike: 15, armor: 12, agility: 5 },
  };
}

export default function CardPreviewPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 font-pixel text-sm text-phosphor">FIGHTER CARD PREVIEW</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {MOCK.map((m) => (
          <FighterCard key={m.rarity} fighter={mockFighter(m.rarity, m.score)} variant="profile" />
        ))}
      </div>
    </main>
  );
}
