'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FighterCard, type FighterCardData } from './FighterCard';
import type { BattleResolution } from '@/lib/wallet-wars/battleResolver';
import type { StatKey } from '@/lib/wallet-wars/fighterStats';

interface BattleArenaProps {
  challenger: FighterCardData;
  opponent: FighterCardData;
  resolution: BattleResolution;
  challengerWon: boolean;
  pointsAwarded: number;
  battleId: string;
  onDone: () => void;
}

type Phase = 'intro' | 'round' | 'clash' | 'shatter' | 'victory' | 'done';

const INTRO_MS = 650;
const ROUND_MS = 800;
const CLASH_MS = 450;
const SHATTER_MS = 650;
const VICTORY_MS = 1100;

function roundHighlights(
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

export function BattleArena({
  challenger,
  opponent,
  resolution,
  challengerWon,
  pointsAwarded,
  battleId,
  onDone,
}: BattleArenaProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [roundIndex, setRoundIndex] = useState(0);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [flash, setFlash] = useState(false);
  const skippedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const skip = useCallback(() => {
    if (skippedRef.current) return;
    skippedRef.current = true;
    setPhase('victory');
    setDisplayPoints(pointsAwarded);
    setFlash(false);
    window.setTimeout(() => {
      setPhase('done');
      onDoneRef.current();
    }, 450);
  }, [pointsAwarded]);

  // Intro → first round
  useEffect(() => {
    if (skippedRef.current) return;
    const id = window.setTimeout(() => setPhase('round'), INTRO_MS);
    return () => window.clearTimeout(id);
  }, []);

  // Round loop
  useEffect(() => {
    if (skippedRef.current || phase !== 'round') return;

    if (roundIndex >= resolution.rounds.length) {
      setPhase('shatter');
      return;
    }

    const round = resolution.rounds[roundIndex];
    const deciding = resolution.decidingStat === round.stat;

    if (deciding) {
      setFlash(true);
      setPhase('clash');
      const clashId = window.setTimeout(() => {
        if (skippedRef.current) return;
        setFlash(false);
        setPhase('round');
        setRoundIndex((i) => i + 1);
      }, CLASH_MS);
      return () => window.clearTimeout(clashId);
    }

    const id = window.setTimeout(() => {
      if (skippedRef.current) return;
      setRoundIndex((i) => i + 1);
    }, ROUND_MS);
    return () => window.clearTimeout(id);
  }, [phase, roundIndex, resolution]);

  // Shatter → victory
  useEffect(() => {
    if (skippedRef.current || phase !== 'shatter') return;
    const id = window.setTimeout(() => setPhase('victory'), SHATTER_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Victory points count-up → done
  useEffect(() => {
    if (skippedRef.current || phase !== 'victory') return;

    const start = Date.now();
    const tick = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / VICTORY_MS);
      setDisplayPoints(Math.round(pointsAwarded * t));
      if (t >= 1) {
        window.clearInterval(tick);
        window.setTimeout(() => {
          if (skippedRef.current) return;
          setPhase('done');
          onDoneRef.current();
        }, 400);
      }
    }, 40);

    return () => window.clearInterval(tick);
  }, [phase, pointsAwarded]);

  const inRounds = phase === 'round' || phase === 'clash';
  const highlights =
    inRounds && roundIndex < resolution.rounds.length
      ? roundHighlights(resolution, roundIndex)
      : { challenger: {}, opponent: {} };

  const shatterPhase = phase === 'shatter' || phase === 'victory' || phase === 'done';
  const challengerShattered = shatterPhase && !challengerWon;
  const opponentShattered = shatterPhase && challengerWon;
  const showVictory = phase === 'victory' || phase === 'done';

  return (
    <div
      className={`relative min-h-[70vh] overflow-hidden px-2 py-6 ${
        phase === 'clash' ? 'animate-battle-shake' : ''
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 z-20 ${flash ? 'battle-flash' : ''}`}
        aria-hidden
      />

      <div className="mb-4 flex items-center justify-between">
        <p className="font-pixel text-[9px] text-magenta">WALLET WARS // BATTLE</p>
        <button type="button" className="chip-btn text-[10px]" onClick={skip}>
          SKIP
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className={`battle-card-slot ${
            phase === 'intro' ? 'battle-enter-left' : ''
          } ${showVictory && challengerWon ? 'battle-winner-pop' : ''}`}
        >
          <FighterCard
            fighter={challenger}
            variant="battle"
            highlightStats={highlights.challenger}
            shattered={challengerShattered}
          />
        </div>
        <div
          className={`battle-card-slot ${
            phase === 'intro' ? 'battle-enter-right' : ''
          } ${showVictory && !challengerWon ? 'battle-winner-pop' : ''}`}
        >
          <FighterCard
            fighter={opponent}
            variant="battle"
            highlightStats={highlights.opponent}
            shattered={opponentShattered}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-30 text-center">
        <p
          className={`font-pixel text-lg text-phosphor transition-all duration-300 ${
            showVictory ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
          }`}
          style={{ textShadow: '0 0 12px rgba(39,255,125,0.8)' }}
        >
          {challengerWon ? 'VICTORY' : 'DEFEAT'}
        </p>
        <p className="mt-2 font-pixel text-sm text-amber">+{displayPoints}</p>
        <p className="mt-1 font-term text-sm text-bone/60">Battle #{battleId.slice(0, 8)}</p>
      </div>
    </div>
  );
}
