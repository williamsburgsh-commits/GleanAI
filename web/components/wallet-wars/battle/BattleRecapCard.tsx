'use client';

import type { BattleResolution } from '@/lib/wallet-wars/battleResolver';
import type { FighterCardData } from '../FighterCard';
import { STAT_LABELS, type StatKey } from '@/lib/wallet-wars/fighterStats';
import { getLevelTitle } from '@/lib/levels';
import { FighterPortrait } from '../FighterPortrait';

interface BattleRecapCardProps {
  challenger: FighterCardData;
  opponent: FighterCardData;
  resolution: BattleResolution;
  challengerWon: boolean;
  isTie: boolean;
  pointsBefore: number;
  pointsAfter: number;
}

function RoundMark({ win, lose }: { win: boolean; lose: boolean }) {
  if (win) return <span className="text-phosphor">✓</span>;
  if (lose) return <span className="text-magenta">✗</span>;
  return <span className="text-ash">—</span>;
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
      <p className="mb-4 text-center font-pixel text-[9px] text-magenta">
        ⚔ WALLET WARS — BATTLE RECAP
      </p>

      {/* Fighters: name + avatar stacked per column */}
      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div className="flex flex-col items-center gap-2 min-w-0">
          <p className="w-full truncate text-center font-pixel text-[8px] text-phosphor">
            {challenger.name}
          </p>
          <FighterPortrait
            avatarUrl={challenger.avatarUrl}
            walletAddress={challenger.walletAddress}
            strike={challenger.strike}
            shield={challenger.shield}
            power={challenger.power}
            armor={challenger.armor}
            agility={challenger.agility}
            rarity={challenger.rarity}
            className="h-14 w-14 shrink-0 border-2 border-bone/30 bg-void"
          />
        </div>
        <span className="pb-5 font-pixel text-[8px] text-ash">vs</span>
        <div className="flex flex-col items-center gap-2 min-w-0">
          <p className="w-full truncate text-center font-pixel text-[8px] text-magenta">
            {opponent.name}
          </p>
          <FighterPortrait
            avatarUrl={opponent.avatarUrl}
            walletAddress={opponent.walletAddress}
            strike={opponent.strike}
            shield={opponent.shield}
            power={opponent.power}
            armor={opponent.armor}
            agility={opponent.agility}
            rarity={opponent.rarity}
            className="h-14 w-14 shrink-0 border-2 border-bone/30 bg-void"
          />
        </div>
      </div>

      {/* Stats: fixed columns — label | mark | value | vs | mark | value */}
      <ul className="space-y-1.5 font-term text-sm text-bone">
        {resolution.rounds.map((r) => {
          const label = STAT_LABELS[r.stat as StatKey];
          const cWin = r.winner === 'challenger';
          const oWin = r.winner === 'opponent';
          return (
            <li
              key={r.stat}
              className="grid grid-cols-[4.25rem_1rem_2.75rem_1.25rem_1rem_2.75rem] items-center justify-center gap-x-1"
            >
              <span className="text-ash">{label}</span>
              <span className="text-center">
                <RoundMark win={cWin} lose={oWin} />
              </span>
              <span className="text-right tabular-nums">{r.challenger}</span>
              <span className="text-center text-xs text-ash">vs</span>
              <span className="text-center">
                <RoundMark win={oWin} lose={cWin} />
              </span>
              <span className="text-left tabular-nums">{r.opponent}</span>
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
      <p className="mt-3 text-center font-term text-xs text-cyan/80">
        glean-ai-web.vercel.app/wallet-wars
      </p>
    </div>
  );
}
