'use client';

import { useRef, useEffect, useState } from 'react';
import { FighterCard, type FighterCardData } from './FighterCard';
import { createBattleTimeline } from '@/lib/wallet-wars/battleTimeline';
import type { BattleResolution } from '@/lib/wallet-wars/battleResolver';

interface BattleArenaProps {
  challenger: FighterCardData;
  opponent: FighterCardData;
  resolution: BattleResolution;
  challengerWon: boolean;
  pointsAwarded: number;
  battleId: string;
  onDone: () => void;
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
  const arenaRef = useRef<HTMLDivElement>(null);
  const challengerRef = useRef<HTMLDivElement>(null);
  const opponentRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const victoryRef = useRef<HTMLParagraphElement>(null);
  const pointsRef = useRef<HTMLParagraphElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (started) return;
    if (
      !arenaRef.current ||
      !challengerRef.current ||
      !opponentRef.current ||
      !flashRef.current ||
      !victoryRef.current ||
      !pointsRef.current ||
      !skipRef.current
    ) {
      return;
    }

    setStarted(true);
    victoryRef.current.textContent = challengerWon ? 'VICTORY' : 'DEFEAT';

    const tl = createBattleTimeline(
      {
        arena: arenaRef.current,
        challengerCard: challengerRef.current,
        opponentCard: opponentRef.current,
        flash: flashRef.current,
        victoryText: victoryRef.current,
        pointsEl: pointsRef.current,
        skipBtn: skipRef.current,
      },
      resolution,
      challengerWon,
      pointsAwarded,
      onDone
    );

    return () => {
      tl.kill();
    };
  }, [started, challengerWon, onDone, pointsAwarded, resolution]);

  return (
    <div ref={arenaRef} className="relative min-h-[70vh] overflow-hidden px-2 py-6">
      <div
        ref={flashRef}
        className="pointer-events-none absolute inset-0 z-20"
        aria-hidden
      />

      <div className="mb-4 flex items-center justify-between">
        <p className="font-pixel text-[9px] text-magenta">WALLET WARS // BATTLE</p>
        <button ref={skipRef} type="button" className="chip-btn text-[10px]">
          SKIP
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div ref={challengerRef}>
          <FighterCard fighter={challenger} variant="battle" />
        </div>
        <div ref={opponentRef}>
          <FighterCard fighter={opponent} variant="battle" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-30 text-center">
        <p
          ref={victoryRef}
          className="font-pixel text-lg text-phosphor opacity-0"
          style={{ textShadow: '0 0 12px rgba(39,255,125,0.8)' }}
        />
        <p
          ref={pointsRef}
          className="mt-2 font-pixel text-sm text-amber"
        >
          0
        </p>
        <p className="mt-1 font-term text-sm text-bone/60">Battle #{battleId.slice(0, 8)}</p>
      </div>
    </div>
  );
}
