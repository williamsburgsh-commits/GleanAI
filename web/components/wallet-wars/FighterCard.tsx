'use client';

import { HoloCard } from './HoloCard';
import { StatBar } from './StatBar';
import { rarityBorderClass, rarityLabel, type FighterRarity } from '@/lib/wallet-wars/rarity';
import type { StatKey } from '@/lib/wallet-wars/fighterStats';
import type { QuestBonus } from '@/lib/wallet-wars/questBoosts';

export interface FighterCardData {
  name: string;
  walletAddress?: string;
  avatarUrl: string;
  shield: number;
  power: number;
  strike: number;
  agility: number;
  totalScore: number;
  rarity: FighterRarity;
  questBonus?: QuestBonus;
}

interface FighterCardProps {
  fighter: FighterCardData;
  variant?: 'profile' | 'battle' | 'mini';
  highlightStats?: Partial<Record<StatKey, 'win' | 'lose'>>;
  shattered?: boolean;
  className?: string;
}

export function FighterCard({
  fighter,
  variant = 'profile',
  highlightStats = {},
  shattered = false,
  className = '',
}: FighterCardProps) {
  const isMini = variant === 'mini';
  const stats: { key: StatKey; value: number }[] = [
    { key: 'shield', value: fighter.shield },
    { key: 'power', value: fighter.power },
    { key: 'strike', value: fighter.strike },
    { key: 'agility', value: fighter.agility },
  ];

  const questTotal = fighter.questBonus
    ? fighter.questBonus.shield +
      fighter.questBonus.power +
      fighter.questBonus.strike +
      fighter.questBonus.agility
    : 0;

  const cardInner = (
    <div
      className={`relative flex flex-col border-4 bg-[#0d1219] ${rarityBorderClass(fighter.rarity)} ${
        shattered ? 'fighter-shatter' : ''
      } ${isMini ? 'p-2' : 'p-3'}`}
      style={{ aspectRatio: '2.5 / 3.5' }}
    >
      <div className="border-b-2 border-bone/20 pb-2">
        <p className={`font-pixel uppercase text-phosphor ${isMini ? 'text-[7px]' : 'text-[9px]'}`}>
          {fighter.name}
        </p>
        <p className={`mt-1 font-pixel text-amber/90 ${isMini ? 'text-[6px]' : 'text-[7px]'}`}>
          {rarityLabel(fighter.rarity)}
        </p>
      </div>

      <div
        className={`relative mx-auto my-2 overflow-hidden border-2 border-bone/30 bg-void ${
          isMini ? 'h-16 w-16' : 'h-24 w-24'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fighter.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {!isMini && (
        <div className="mt-auto space-y-2">
          {stats.map(({ key, value }) => (
            <StatBar
              key={key}
              stat={key}
              value={value}
              highlight={highlightStats[key] ?? null}
              animate={variant === 'battle'}
            />
          ))}
          <div className="flex items-center justify-between border-t-2 border-bone/20 pt-2 font-pixel text-[7px] text-bone/70">
            <span>PWR {fighter.totalScore}</span>
            {questTotal > 0 && <span className="text-phosphor">+QUEST {questTotal}</span>}
          </div>
        </div>
      )}
    </div>
  );

  if (isMini) {
    return <div className={className}>{cardInner}</div>;
  }

  return (
    <HoloCard rarity={fighter.rarity} className={className}>
      {cardInner}
    </HoloCard>
  );
}
