'use client';

import type { BattleResolution } from '@/lib/wallet-wars/battleResolver';
import type { FighterCardData } from '../FighterCard';
import { STAT_LABELS, type StatKey } from '@/lib/wallet-wars/fighterStats';
import { getLevelTitle } from '@/lib/levels';

interface BattleRecapCardProps {
  challenger: FighterCardData;
  opponent: FighterCardData;
  resolution: BattleResolution;
  challengerWon: boolean;
  isTie: boolean;
  pointsBefore: number;
  pointsAfter: number;
}

export function BattleRecapCard({
  challenger,
  opponent,
  resolution,
  challengerWon,
  isTie,
  pointsBefore,
  pointsAfter,
}: BattleRecapCardProps) {
  const rankBefore = getLevelTitle(pointsBefore);
  const rankAfter = getLevelTitle(pointsAfter);
  const rankChanged = rankBefore !== rankAfter;

  const winnerName = isTie ? 'DRAW' : challengerWon ? challenger.name : opponent.name;
  const score = `${resolution.challengerWins}-${resolution.opponentWins}`;

  return (
    <div className="mx-auto max-w-md border-4 border-cyan/50 bg-[#0d1219] p-4 text-left">
      <p className="mb-3 text-center font-pixel text-[9px] text-magenta">
        ⚔ WALLET WARS — BATTLE RECAP
      </p>
      <div className="mb-4 flex items-center justify-between gap-2 font-pixel text-[8px] text-phosphor">
        <span className="truncate">{challenger.name}</span>
        <span className="text-ash">vs</span>
        <span className="truncate text-magenta">{opponent.name}</span>
      </div>
      <div className="mb-4 flex justify-between gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={challenger.avatarUrl}
          alt=""
          className="h-14 w-14 border-2 border-bone/30 object-cover"
          style={{ imageRendering: 'pixelated' }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={opponent.avatarUrl}
          alt=""
          className="h-14 w-14 border-2 border-bone/30 object-cover"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      <ul className="space-y-1 font-term text-sm text-bone">
        {resolution.rounds.map((r) => {
          const label = STAT_LABELS[r.stat as StatKey];
          const cWin = r.winner === 'challenger';
          const oWin = r.winner === 'opponent';
          return (
            <li key={r.stat} className="flex justify-between gap-2">
              <span className="text-ash">{label}:</span>
              <span>
                {cWin ? '✅' : oWin ? '❌' : '—'} {r.challenger}
              </span>
              <span className="text-ash">vs</span>
              <span>
                {oWin ? '✅' : cWin ? '❌' : '—'} {r.opponent}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-center font-pixel text-[9px] text-phosphor">
        RESULT: {winnerName} {isTie ? '' : `WINS ${score}`} ⚔
      </p>
      {rankChanged && (
        <p className="mt-2 text-center font-pixel text-[8px] text-amber">
          RANK: {rankBefore.toUpperCase()} → {rankAfter.toUpperCase()}
        </p>
      )}
      <p className="mt-3 text-center font-term text-xs text-cyan/80">glean-ai-web.vercel.app/wallet-wars</p>
    </div>
  );
}

export function buildRecapShareText(
  challenger: FighterCardData,
  opponent: FighterCardData,
  resolution: BattleResolution,
  challengerWon: boolean,
  isTie: boolean
): string {
  const winner = isTie ? 'DRAW' : challengerWon ? challenger.name : opponent.name;
  const lines = resolution.rounds.map((r) => {
    const label = STAT_LABELS[r.stat as StatKey];
    const c = r.winner === 'challenger' ? '✅' : r.winner === 'opponent' ? '❌' : '—';
    const o = r.winner === 'opponent' ? '✅' : r.winner === 'challenger' ? '❌' : '—';
    return `${label}: ${c} ${r.challenger} vs ${o} ${r.opponent}`;
  });
  return [
    '⚔️ WALLET WARS — BATTLE RECAP',
    `${challenger.name} vs ${opponent.name}`,
    ...lines,
    `RESULT: ${winner} ${isTie ? '' : `${resolution.challengerWins}-${resolution.opponentWins}`}`,
    'https://glean-ai-web.vercel.app/wallet-wars',
  ].join('\n');
}
