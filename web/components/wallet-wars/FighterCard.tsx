'use client';

import { HoloCard } from './HoloCard';
import { StatBar } from './StatBar';
import {
  rarityFrameClass,
  rarityGemClass,
  rarityLabel,
  type FighterRarity,
} from '@/lib/wallet-wars/rarity';
import { STAT_KEYS, type StatKey } from '@/lib/wallet-wars/fighterStats';
import type { QuestBonus } from '@/lib/wallet-wars/questBoosts';
import { shortenWallet } from '@/lib/format';

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

  const shortWallet = fighter.walletAddress
    ? shortenWallet(fighter.walletAddress)
    : null;

  const nameSize = isMini ? 'text-[7px]' : isBattle ? 'text-[7px]' : 'text-[9px]';
  const metaSize = isMini ? 'text-[5px]' : isBattle ? 'text-[5px]' : 'text-[6px]';
  const gemSize = isMini ? 'text-[5px]' : isBattle ? 'text-[5px]' : 'text-[6px]';
  const pad = isMini || isBattle ? 'p-1.5' : 'p-2';

  const showPlate = !isMini && !hideStats;

  const cardInner = (
    <div
      className={`fighter-card-frame relative grid ${rarityFrameClass(fighter.rarity)} ${streakClass} ${
        shattered ? 'fighter-shatter' : ''
      } ${cracked ? 'battle-card-cracked' : ''} ${worried ? 'battle-card-worried' : ''} ${pad}`}
      style={{
        aspectRatio: '2.5 / 3.5',
        gridTemplateRows: showPlate ? 'auto minmax(0, 1fr) auto' : 'auto minmax(0, 1fr)',
      }}
    >
      <div className="fighter-card-corners" aria-hidden />

      {/* Nameplate */}
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p
            className={`truncate font-pixel uppercase leading-tight text-phosphor ${nameSize}`}
            title={fighter.name}
          >
            {fighter.name}
          </p>
          {shortWallet && (
            <p className={`mt-0.5 truncate font-term text-bone/55 ${metaSize}`}>{shortWallet}</p>
          )}
        </div>
        <span
          className={`shrink-0 border px-1 py-0.5 font-pixel uppercase leading-none ${gemSize} ${rarityGemClass(fighter.rarity)}`}
        >
          {rarityLabel(fighter.rarity)}
        </span>
      </div>

      {/* Art window — dominates card height */}
      <div className={`fighter-card-art ${isBattle || isMini ? 'mt-1' : 'mt-1.5'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fighter.avatarUrl}
          alt=""
          className={`h-full w-full object-cover ${worried ? 'opacity-70 grayscale-[30%]' : ''}`}
          style={{ imageRendering: 'pixelated' }}
        />
        {variant === 'battle' && !worried && !shattered && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] hidden font-pixel text-[6px] text-phosphor battle-victory-pose">
            ▲▲
          </div>
        )}
      </div>

      {/* Stat plate */}
      {showPlate && (
        <div className={`fighter-card-plate ${isBattle ? 'space-y-0.5' : 'space-y-1'}`}>
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
            className={`mt-0.5 flex items-center justify-between gap-1 border-t border-bone/15 pt-1 font-pixel ${
              isBattle ? 'text-[5px]' : 'text-[6px]'
            }`}
          >
            <span className="truncate text-bone/50">
              GLEAN
              {shortWallet ? ` · ${shortWallet}` : ''}
              {questTotal > 0 ? (
                <span className="text-phosphor"> · +Q{questTotal}</span>
              ) : null}
            </span>
            <span className={`fighter-card-pwr shrink-0 ${isBattle ? 'text-[6px]' : 'text-[8px]'}`}>
              PWR {fighter.totalScore}
            </span>
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
