'use client';

import { HoloCard } from './HoloCard';
import { StatBar } from './StatBar';
import { rarityBorderClass, rarityLabel, type FighterRarity } from '@/lib/wallet-wars/rarity';
import { STAT_KEYS, type StatKey } from '@/lib/wallet-wars/fighterStats';
import type { QuestBonus } from '@/lib/wallet-wars/questBoosts';

export interface FighterCardData {
  name: string;
  walletAddress?: string;
  avatarUrl: string;
  strike: number;
  shield: number;
  power: number;
  armor: number;
  agility: number;
  totalScore: number;
  rarity: FighterRarity;
  questBonus?: QuestBonus;
  badgeMint?: string | null;
}

interface FighterCardProps {
  fighter: FighterCardData;
  variant?: 'profile' | 'battle' | 'mini';
  highlightStats?: Partial<Record<StatKey, 'win' | 'lose'>>;
  shattered?: boolean;
  cracked?: boolean;
  worried?: boolean;
  streakBorder?: 'fire' | 'lightning' | null;
  className?: string;
  hideStats?: boolean;
  revealedStats?: Partial<Record<StatKey, boolean>>;
  displayStats?: Partial<Record<StatKey, number>>;
  activeStat?: StatKey | null;
  decidingStat?: boolean;
}

export function FighterCard({
  fighter,
  variant = 'profile',
  highlightStats = {},
  shattered = false,
  cracked = false,
  worried = false,
  streakBorder = null,
  className = '',
  hideStats = false,
  revealedStats,
  displayStats,
  activeStat = null,
  decidingStat = false,
}: FighterCardProps) {
  const isBattle = variant === 'battle';
  const isMini = variant === 'mini';
  const stats = STAT_KEYS.map((key) => ({
    key,
    value: fighter[key],
  }));

  const questTotal = fighter.questBonus
    ? fighter.questBonus.shield +
      fighter.questBonus.power +
      fighter.questBonus.strike +
      fighter.questBonus.armor +
      fighter.questBonus.agility
    : 0;

  const streakClass =
    streakBorder === 'fire'
      ? 'battle-streak-fire'
      : streakBorder === 'lightning'
        ? 'battle-streak-lightning'
        : '';

  const cardInner = (
    <div
      className={`relative flex flex-col border-4 bg-[#0d1219] ${rarityBorderClass(fighter.rarity)} ${streakClass} ${
        shattered ? 'fighter-shatter' : ''
      } ${cracked ? 'battle-card-cracked' : ''} ${worried ? 'battle-card-worried' : ''} ${
        isMini ? 'p-2' : isBattle ? 'p-2' : 'p-3'
      }`}
      style={{ aspectRatio: '2.5 / 3.5' }}
    >
      <div className={`border-b-2 border-bone/20 ${isBattle ? 'pb-1' : 'pb-2'}`}>
        <p
          className={`font-pixel uppercase text-phosphor ${
            isMini ? 'text-[7px]' : isBattle ? 'text-[7px]' : 'text-[9px]'
          }`}
        >
          {fighter.name}
        </p>
        <p
          className={`mt-0.5 font-pixel text-amber/90 ${
            isMini ? 'text-[6px]' : isBattle ? 'text-[6px]' : 'text-[7px]'
          }`}
        >
          {rarityLabel(fighter.rarity)}
        </p>
      </div>

      <div
        className={`relative mx-auto overflow-hidden border-2 border-bone/30 bg-void ${
          isMini ? 'my-1 h-16 w-16' : isBattle ? 'my-1 h-14 w-14' : 'my-2 h-24 w-24'
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fighter.avatarUrl}
          alt=""
          className={`h-full w-full object-cover ${worried ? 'opacity-70 grayscale-[30%]' : ''}`}
          style={{ imageRendering: 'pixelated' }}
        />
        {variant === 'battle' && !worried && !shattered && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden font-pixel text-[6px] text-phosphor battle-victory-pose">
            ▲▲
          </div>
        )}
      </div>

      {!isMini && !hideStats && (
        <div className={`mt-auto ${isBattle ? 'space-y-1' : 'space-y-2'}`}>
          {stats.map(({ key, value }) => (
            <StatBar
              key={key}
              stat={key}
              value={value}
              displayValue={displayStats?.[key]}
              revealed={revealedStats ? revealedStats[key] !== false : true}
              highlight={highlightStats[key] ?? null}
              animate={variant === 'battle'}
              active={activeStat === key}
              deciding={decidingStat && activeStat === key}
            />
          ))}
          <div
            className={`flex items-center justify-between border-t-2 border-bone/20 font-pixel text-bone/70 ${
              isBattle ? 'pt-1 text-[6px]' : 'pt-2 text-[7px]'
            }`}
          >
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
