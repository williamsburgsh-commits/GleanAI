'use client';

import { FighterCard, type FighterCardData } from '../FighterCard';
import { CardBack } from './CardBack';
import type { StatKey } from '@/lib/wallet-wars/fighterStats';

export type CardFace = 'back' | 'flipping' | 'front';

interface BattleCardProps {
  fighter: FighterCardData;
  face: CardFace;
  slideClass?: string;
  highlightStats?: Partial<Record<StatKey, 'win' | 'lose'>>;
  shattered?: boolean;
  cracked?: boolean;
  worried?: boolean;
  streakBorder?: 'fire' | 'lightning' | null;
  hideStats?: boolean;
  revealedStats?: Partial<Record<StatKey, boolean>>;
  displayStats?: Partial<Record<StatKey, number>>;
  activeStat?: StatKey | null;
  decidingStat?: boolean;
  winnerZoom?: boolean;
  loserSlam?: boolean;
}

export function BattleCard({
  fighter,
  face,
  slideClass = '',
  highlightStats,
  shattered,
  cracked,
  worried,
  streakBorder,
  hideStats,
  revealedStats,
  displayStats,
  activeStat,
  decidingStat,
  winnerZoom,
  loserSlam,
}: BattleCardProps) {
  const showFront = face === 'front' || face === 'flipping';

  return (
    <div
      className={`battle-card-3d ${slideClass} ${face === 'flipping' ? 'battle-card-flipping' : ''} ${
        winnerZoom ? 'battle-winner-zoom' : ''
      } ${loserSlam ? 'battle-loser-slam' : ''}`}
    >
      <div className="battle-card-3d-inner">
        <div className="battle-card-face battle-card-back">
          <CardBack />
        </div>
        <div className={`battle-card-face battle-card-front ${showFront ? 'battle-card-front-visible' : ''}`}>
          <FighterCard
            fighter={fighter}
            variant="battle"
            highlightStats={highlightStats}
            shattered={shattered}
            cracked={cracked}
            worried={worried}
            streakBorder={streakBorder}
            hideStats={hideStats}
            revealedStats={revealedStats}
            displayStats={displayStats}
            activeStat={activeStat}
            decidingStat={decidingStat}
          />
        </div>
      </div>
    </div>
  );
}
