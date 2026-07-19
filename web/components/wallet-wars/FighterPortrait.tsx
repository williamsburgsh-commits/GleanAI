'use client';

import { useMemo } from 'react';
import type { FighterRarity } from '@/lib/wallet-wars/rarity';
import { buildFighterTraits, getGearOverlayCells } from '@/lib/wallet-wars/fighterTraits';
import { isKolWallet } from '@/lib/wallet-wars/kolRegistry';

export interface FighterPortraitProps {
  avatarUrl: string;
  walletAddress?: string | null;
  strike: number;
  shield: number;
  power: number;
  armor: number;
  agility: number;
  rarity: FighterRarity;
  className?: string;
  imgClassName?: string;
  worried?: boolean;
  showGear?: boolean;
}

function shouldSkipGear(avatarUrl: string, walletAddress?: string | null): boolean {
  if (isKolWallet(walletAddress)) return true;
  if (avatarUrl.includes('/bosses/')) return true;
  return false;
}

export function FighterPortrait({
  avatarUrl,
  walletAddress,
  strike,
  shield,
  power,
  armor,
  agility,
  rarity,
  className = '',
  imgClassName = '',
  worried = false,
  showGear = true,
}: FighterPortraitProps) {
  const gearCells = useMemo(() => {
    if (!showGear || shouldSkipGear(avatarUrl, walletAddress)) return null;
    const traits = buildFighterTraits(
      { strike, shield, power, armor, agility },
      rarity
    );
    return getGearOverlayCells(traits);
  }, [showGear, avatarUrl, walletAddress, strike, shield, power, armor, agility, rarity]);

  const filterClass = worried ? 'opacity-70 grayscale-[30%]' : '';

  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarUrl}
        alt=""
        className={`h-full w-full object-cover ${filterClass} ${imgClassName}`}
        style={{ imageRendering: 'pixelated' }}
      />
      {gearCells && gearCells.length > 0 && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 32 32"
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
          aria-hidden
        >
          {gearCells.map(([x, y, fill]) => (
            <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={fill} />
          ))}
        </svg>
      )}
    </div>
  );
}
