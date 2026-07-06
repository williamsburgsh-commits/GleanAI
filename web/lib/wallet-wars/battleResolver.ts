import {
  STAT_KEYS,
  type StatKey,
  type BaseStats,
} from './fighterStats';

export interface BattleRound {
  stat: StatKey;
  challenger: number;
  opponent: number;
  winner: 'challenger' | 'opponent' | 'tie';
  isDeciding?: boolean;
  critical?: 'challenger' | 'opponent' | null;
}

export interface BattleResolution {
  rounds: BattleRound[];
  challengerWins: number;
  opponentWins: number;
  winner: 'challenger' | 'opponent' | 'tie';
  decidingStat: StatKey | null;
}

export interface FighterSnapshot {
  id?: string;
  name: string;
  walletAddress?: string;
  avatarUrl: string;
  stats: BaseStats;
  totalScore: number;
  rarity: string;
  isBot?: boolean;
}

const BATTLE_TIE_POINTS = 10;

export { BATTLE_TIE_POINTS };

function critChance(agility: number): number {
  return Math.min(0.25, 0.05 + agility / 600);
}

function rollCrit(agility: number, seed: number): boolean {
  return seed < critChance(agility);
}

function effectiveStat(value: number, crit: boolean): number {
  return crit ? Math.round(value * 1.5) : value;
}

export function resolveBattle(
  challenger: FighterSnapshot,
  opponent: FighterSnapshot,
  seed = Math.random()
): BattleResolution {
  const rounds: BattleRound[] = [];
  let challengerWins = 0;
  let opponentWins = 0;
  let decidingStat: StatKey | null = null;

  for (let i = 0; i < STAT_KEYS.length; i++) {
    const stat = STAT_KEYS[i];
    const cBase = challenger.stats[stat];
    const oBase = opponent.stats[stat];
    const cCrit = stat === 'agility' ? false : rollCrit(challenger.stats.agility, (seed + i * 0.17) % 1);
    const oCrit = stat === 'agility' ? false : rollCrit(opponent.stats.agility, (seed + i * 0.31 + 0.5) % 1);
    const c = effectiveStat(cBase, cCrit);
    const o = effectiveStat(oBase, oCrit);

    let winner: BattleRound['winner'] = 'tie';
    if (c > o) {
      winner = 'challenger';
      challengerWins += 1;
    } else if (o > c) {
      winner = 'opponent';
      opponentWins += 1;
    }
    const isDeciding =
      decidingStat === null && (challengerWins >= 3 || opponentWins >= 3);
    if (isDeciding) decidingStat = stat;

    rounds.push({
      stat,
      challenger: c,
      opponent: o,
      winner,
      isDeciding,
      critical:
        cCrit && !oCrit ? 'challenger' : oCrit && !cCrit ? 'opponent' : null,
    });
  }

  let winner: BattleResolution['winner'];
  if (challengerWins > opponentWins) {
    winner = 'challenger';
  } else if (opponentWins > challengerWins) {
    winner = 'opponent';
  } else {
    winner = 'tie';
    decidingStat = decidingStat ?? STAT_KEYS[STAT_KEYS.length - 1];
  }

  if (decidingStat === null) {
    decidingStat = rounds.find((r) => r.winner !== 'tie')?.stat ?? 'strike';
  }

  return { rounds, challengerWins, opponentWins, winner, decidingStat };
}

export const BATTLE_WIN_POINTS = 25;
export const BATTLE_LOSS_POINTS = 5;
