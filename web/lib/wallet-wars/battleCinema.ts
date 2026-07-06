import type { BattleResolution } from './battleResolver';
import type { StatKey } from './fighterStats';
import { CLASH_PAUSE_MS, DECIDING_SLOW_MULTIPLIER, STAT_KEYS } from './fighterStats';

export type CinemaPhase =
  | 'idle'
  | 'entrance'
  | 'flip'
  | 'scan'
  | 'clash'
  | 'deciding'
  | 'silence'
  | 'boom'
  | 'outcome'
  | 'recap'
  | 'done';

export const CINEMA_TIMING = {
  entranceMs: 2000,
  flipMs: 600,
  scanMs: 3000,
  statClashMs: 900,
  decidingClashMs: 900 * DECIDING_SLOW_MULTIPLIER,
  clashPauseMs: CLASH_PAUSE_MS,
  silenceMs: 500,
  boomMs: 400,
  outcomeMs: 2500,
  recapMs: 4000,
  scanPerStatMs: 500,
};

export function delay(ms: number, cancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const id = setTimeout(() => resolve(), ms);
    if (cancelled()) clearTimeout(id);
  });
}

export async function animateCountUp(
  from: number,
  to: number,
  durationMs: number,
  onTick: (v: number) => void,
  cancelled: () => boolean
) {
  const start = Date.now();
  while (!cancelled()) {
    const t = Math.min(1, (Date.now() - start) / durationMs);
    onTick(Math.round(from + (to - from) * t));
    if (t >= 1) break;
    await delay(30, cancelled);
  }
}

export function roundHighlights(
  resolution: BattleResolution,
  index: number
): {
  challenger: Partial<Record<StatKey, 'win' | 'lose'>>;
  opponent: Partial<Record<StatKey, 'win' | 'lose'>>;
} {
  const round = resolution.rounds[index];
  if (!round) return { challenger: {}, opponent: {} };
  const key = round.stat;
  if (round.winner === 'challenger') {
    return { challenger: { [key]: 'win' }, opponent: { [key]: 'lose' } };
  }
  if (round.winner === 'opponent') {
    return { challenger: { [key]: 'lose' }, opponent: { [key]: 'win' } };
  }
  return { challenger: {}, opponent: {} };
}

export function initialRevealedStats(): Record<StatKey, boolean> {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, false])) as Record<StatKey, boolean>;
}

export function allRevealedStats(): Record<StatKey, boolean> {
  return Object.fromEntries(STAT_KEYS.map((k) => [k, true])) as Record<StatKey, boolean>;
}

export function streakBorder(streak: number): 'fire' | 'lightning' | null {
  if (streak >= 5) return 'lightning';
  if (streak >= 3) return 'fire';
  return null;
}
