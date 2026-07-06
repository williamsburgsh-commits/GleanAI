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
}

export interface BattleResolution {
  rounds: BattleRound[];
  challengerWins: number;
  opponentWins: number;
  winner: 'challenger' | 'opponent';
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

export function resolveBattle(
  challenger: FighterSnapshot,
  opponent: FighterSnapshot
): BattleResolution {
  const rounds: BattleRound[] = [];
  let challengerWins = 0;
  let opponentWins = 0;
  let decidingStat: StatKey | null = null;

  for (const stat of STAT_KEYS) {
    const c = challenger.stats[stat];
    const o = opponent.stats[stat];
    let winner: BattleRound['winner'] = 'tie';
    if (c > o) {
      winner = 'challenger';
      challengerWins += 1;
    } else if (o > c) {
      winner = 'opponent';
      opponentWins += 1;
    }
    rounds.push({ stat, challenger: c, opponent: o, winner });
    if (
      decidingStat === null &&
      (challengerWins >= 3 || opponentWins >= 3)
    ) {
      decidingStat = stat;
    }
  }

  let winner: 'challenger' | 'opponent';
  if (challengerWins > opponentWins) {
    winner = 'challenger';
  } else if (opponentWins > challengerWins) {
    winner = 'opponent';
  } else {
    winner =
      challenger.totalScore >= opponent.totalScore ? 'challenger' : 'opponent';
    decidingStat = decidingStat ?? STAT_KEYS[STAT_KEYS.length - 1];
  }

  if (decidingStat === null) {
    decidingStat = rounds.find((r) => r.winner !== 'tie')?.stat ?? 'shield';
  }

  return { rounds, challengerWins, opponentWins, winner, decidingStat };
}

export const BATTLE_WIN_POINTS = 25;
export const BATTLE_LOSS_POINTS = 5;
