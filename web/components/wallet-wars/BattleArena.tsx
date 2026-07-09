'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BattleCard } from './battle/BattleCard';
import { ScanOverlay } from './battle/ScanOverlay';
import { VersusSpark } from './battle/VersusSpark';
import { CardScoreBadge } from './battle/ScoreTicker';
import { Confetti } from './battle/Confetti';
import { BattleRecapCard } from './battle/BattleRecapCard';
import { TauntBanner } from './battle/TauntBanner';
import { BossEntrance, type BossMeta } from './battle/BossEntrance';
import { RankUpCutscene } from './battle/RankUpCutscene';
import { useBattleSound } from './SoundToggle';
import type { FighterCardData } from './FighterCard';
import type { BattleResolution } from '@/lib/wallet-wars/battleResolver';
import {
  animateCountUp,
  allRevealedStats,
  CINEMA_TIMING,
  delay,
  initialRevealedStats,
  roundHighlights,
  streakBorder,
  type CinemaPhase,
} from '@/lib/wallet-wars/battleCinema';
import { STAT_KEYS, type StatKey } from '@/lib/wallet-wars/fighterStats';
import { getLevelProgress } from '@/lib/levels';

interface BattleArenaProps {
  challenger: FighterCardData;
  opponent: FighterCardData;
  resolution: BattleResolution;
  challengerWon: boolean;
  isTie: boolean;
  pointsAwarded: number;
  pointsBefore?: number;
  battleId: string;
  winStreak?: number;
  taunt?: string | null;
  opponentTaunt?: string | null;
  battleMode?: 'normal' | 'boss';
  bossMeta?: BossMeta | null;
  onDone: () => void;
}

export function BattleArena({
  challenger,
  opponent,
  resolution,
  challengerWon,
  isTie,
  pointsAwarded,
  pointsBefore = 0,
  battleId,
  winStreak = 0,
  taunt,
  opponentTaunt,
  battleMode = 'normal',
  bossMeta,
  onDone,
}: BattleArenaProps) {
  const sound = useBattleSound();
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const [phase, setPhase] = useState<CinemaPhase>('idle');
  const [roundIndex, setRoundIndex] = useState(0);
  const [challengerWins, setChallengerWins] = useState(0);
  const [opponentWins, setOpponentWins] = useState(0);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [revealedStats, setRevealedStats] = useState(initialRevealedStats);
  const [displayStats, setDisplayStats] = useState<Partial<Record<StatKey, number>>>({});
  const [activeStat, setActiveStat] = useState<StatKey | null>(null);
  const [showSpark, setShowSpark] = useState(false);
  const [dimArena, setDimArena] = useState(false);
  const [whiteFlash, setWhiteFlash] = useState(false);
  const [showCritical, setShowCritical] = useState(false);
  const [showRankUp, setShowRankUp] = useState(false);
  const [leftFace, setLeftFace] = useState<'back' | 'flipping' | 'front'>('back');
  const [rightFace, setRightFace] = useState<'back' | 'flipping' | 'front'>('back');
  const [entranceDone, setEntranceDone] = useState(false);
  const [bossIntroComplete, setBossIntroComplete] = useState(battleMode !== 'boss');

  const isBossBattle = battleMode === 'boss' && Boolean(bossMeta);

  const cancelledRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const pointsAfter = pointsBefore + pointsAwarded;
  const rankUp =
    getLevelProgress(pointsBefore).level < getLevelProgress(pointsAfter).level;
  const rankTitle = getLevelProgress(pointsAfter).title;

  const skip = useCallback(() => {
    cancelledRef.current = true;
    setBossIntroComplete(true);
    setPhase('recap');
    setLeftFace('front');
    setRightFace('front');
    setRevealedStats(allRevealedStats());
    setDisplayPoints(pointsAwarded);
    setDimArena(false);
    setShowSpark(false);
    soundRef.current.playVictory();
  }, [pointsAwarded]);

  useEffect(() => {
    if (!bossIntroComplete) return;
    cancelledRef.current = false;
    void soundRef.current.resume();

    const cancelled = () => cancelledRef.current;
    const sfx = soundRef.current;

    const run = async () => {
      // Phase 1: Entrance
      setPhase('entrance');
      sfx.play('whoosh');
      await delay(CINEMA_TIMING.entranceMs * 0.7, cancelled);
      if (cancelled()) return;
      sfx.play('thud');
      setEntranceDone(true);
      setPhase('flip');
      setLeftFace('flipping');
      setRightFace('flipping');
      sfx.play('flip');
      await delay(CINEMA_TIMING.flipMs, cancelled);
      if (cancelled()) return;
      setLeftFace('front');
      setRightFace('front');

      // Phase 2: Scan
      setPhase('scan');
      for (const stat of STAT_KEYS) {
        if (cancelled()) return;
        sfx.play('scan-beep');
        setRevealedStats((prev) => ({ ...prev, [stat]: true }));
        const round = resolution.rounds.find((r) => r.stat === stat);
        const target = round?.challenger ?? challenger[stat];
        await animateCountUp(0, target, CINEMA_TIMING.scanPerStatMs, (v) => {
          setDisplayStats((prev) => ({ ...prev, [stat]: v }));
        }, cancelled);
        await delay(120, cancelled);
      }
      setDisplayStats({});

      // Phase 3-4: Stat clashes
      let cWins = 0;
      let oWins = 0;

      for (let i = 0; i < resolution.rounds.length; i++) {
        if (cancelled()) return;
        const round = resolution.rounds[i];
        const isDeciding = round.isDeciding || resolution.decidingStat === round.stat;
        const stat = round.stat;

        setRoundIndex(i);
        setActiveStat(stat);
        setPhase(isDeciding ? 'deciding' : 'clash');
        setDimArena(isDeciding);
        setShowSpark(true);
        sfx.play('scan-beep');

        const clashMs = isDeciding ? CINEMA_TIMING.decidingClashMs : CINEMA_TIMING.statClashMs;

        if (isDeciding) {
          await animateCountUp(0, round.challenger, clashMs * 0.5, (v) => {
            setDisplayStats((prev) => ({ ...prev, [stat]: v }));
          }, cancelled);
          await delay(200, cancelled);
          await animateCountUp(round.challenger, round.opponent, clashMs * 0.5, () => {}, cancelled);
          setDisplayStats((prev) => ({ ...prev, [stat]: round.opponent }));
        } else {
          await animateCountUp(0, Math.max(round.challenger, round.opponent), clashMs * 0.6, (v) => {
            setDisplayStats((prev) => ({ ...prev, [stat]: v }));
          }, cancelled);
          setDisplayStats((prev) => ({
            ...prev,
            [stat]: round.challenger,
          }));
          await delay(150, cancelled);
          setDisplayStats((prev) => ({
            ...prev,
            [stat]: round.opponent,
          }));
        }

        if (round.critical) {
          setShowCritical(true);
          sfx.play('critical');
          await delay(400, cancelled);
          setShowCritical(false);
        }

        if (round.winner === 'challenger') {
          cWins += 1;
          sfx.play('stat-win');
        } else if (round.winner === 'opponent') {
          oWins += 1;
          sfx.play('stat-loss');
        }
        setChallengerWins(cWins);
        setOpponentWins(oWins);
        setShowSpark(false);

        if (isDeciding) {
          setPhase('silence');
          await delay(CINEMA_TIMING.silenceMs, cancelled);
          if (cancelled()) return;
          setPhase('boom');
          sfx.play('boom');
          setWhiteFlash(true);
          await delay(CINEMA_TIMING.boomMs, cancelled);
          setWhiteFlash(false);
          setDimArena(false);
        }

        await delay(CINEMA_TIMING.clashPauseMs, cancelled);
        setDisplayStats({});
      }

      setActiveStat(null);

      // Phase 5: Outcome
      setPhase('outcome');
      if (isTie) {
        sfx.play('critical');
      } else if (challengerWon) {
        sfx.play('fanfare');
      } else {
        sfx.play('defeat');
      }

      const start = Date.now();
      while (!cancelled()) {
        const t = Math.min(1, (Date.now() - start) / CINEMA_TIMING.outcomeMs);
        setDisplayPoints(Math.round(pointsAwarded * t));
        if (t >= 1) break;
        await delay(40, cancelled);
      }
      if (cancelled()) return;

      if (rankUp && challengerWon) {
        setShowRankUp(true);
        sfx.play('coin');
        await delay(2000, cancelled);
        setShowRankUp(false);
      }

      // Phase 6: Recap (user continues manually)
      setPhase('recap');
    };

    run();
    return () => {
      cancelledRef.current = true;
    };
  }, [resolution, challengerWon, isTie, pointsAwarded, challenger, opponent, rankUp, bossIntroComplete]);

  const highlights =
    phase === 'clash' || phase === 'deciding'
      ? roundHighlights(resolution, roundIndex)
      : { challenger: {}, opponent: {} };

  const shatterPhase = phase === 'outcome' || phase === 'recap';
  const challengerShattered = shatterPhase && !challengerWon && !isTie;
  const opponentShattered = shatterPhase && challengerWon && !isTie;
  const challengerWorried = opponentWins >= 2 && challengerWins <= 1 && phase === 'clash';
  const opponentWorried = challengerWins >= 2 && opponentWins <= 1 && phase === 'clash';
  const showOutcome = phase === 'outcome' || phase === 'recap';
  const showRecap = phase === 'recap';

  const streak = streakBorder(winStreak);

  return (
    <div
      className={`relative min-h-0 overflow-hidden px-2 py-4 ${
        entranceDone ? 'battle-thud-shake' : ''
      } ${dimArena ? 'battle-dim-overlay' : ''} ${whiteFlash ? 'battle-white-flash' : ''}`}
      onPointerDown={() => void soundRef.current.resume()}
    >
      <RankUpCutscene
        title={rankTitle}
        visible={showRankUp}
        onDone={() => setShowRankUp(false)}
      />
      <Confetti active={showOutcome && challengerWon && !isTie} />

      <div
        className={`pointer-events-none absolute inset-0 z-20 ${phase === 'boom' ? 'battle-flash' : ''}`}
        aria-hidden
      />

      <div className="mb-2 flex items-center justify-between">
        <p className="font-pixel text-[9px] text-magenta">
          {isBossBattle ? 'BOSS GAUNTLET // BATTLE' : 'WALLET WARS // BATTLE'}
        </p>
        <button type="button" className="chip-btn text-[10px]" onClick={skip}>
          SKIP
        </button>
      </div>

      <TauntBanner text={opponentTaunt ?? taunt} />

      {isBossBattle && bossMeta && !bossIntroComplete && (
        <BossEntrance
          active
          boss={bossMeta}
          opponent={opponent}
          onComplete={() => {
            setBossIntroComplete(true);
            setPhase('bossIntro');
          }}
        />
      )}

      {showCritical && (
        <p className="pointer-events-none absolute inset-x-0 top-20 z-50 text-center font-pixel text-sm text-amber animate-blink">
          CRITICAL!
        </p>
      )}

      <div className="battle-arena-stage relative">
        <VersusSpark visible={showSpark} />
        <div className="battle-arena-slot relative">
          <CardScoreBadge wins={challengerWins} tone="phosphor" />
          <BattleCard
            fighter={challenger}
            face={leftFace}
            slideClass={phase === 'entrance' || phase === 'idle' ? 'battle-enter-left' : ''}
            highlightStats={highlights.challenger}
            shattered={challengerShattered}
            cracked={challengerWorried}
            worried={challengerWorried}
            streakBorder={streak}
            revealedStats={revealedStats}
            displayStats={displayStats}
            activeStat={activeStat}
            decidingStat={phase === 'deciding'}
            winnerZoom={showOutcome && challengerWon && !isTie}
            loserSlam={showOutcome && !challengerWon && !isTie}
          />
        </div>
        <div className="battle-arena-slot relative">
          <CardScoreBadge wins={opponentWins} tone="magenta" />
          <BattleCard
            fighter={opponent}
            face={rightFace}
            slideClass={phase === 'entrance' || phase === 'idle' ? 'battle-enter-right' : ''}
            highlightStats={highlights.opponent}
            shattered={opponentShattered}
            cracked={opponentWorried}
            worried={opponentWorried}
            bossGlow={isBossBattle}
            revealedStats={revealedStats}
            displayStats={displayStats}
            activeStat={activeStat}
            decidingStat={phase === 'deciding'}
            winnerZoom={showOutcome && !challengerWon && !isTie}
            loserSlam={showOutcome && challengerWon && !isTie}
          />
        </div>
        <ScanOverlay active={phase === 'scan'} />
      </div>

      {isTie && showOutcome && (
        <p className="pointer-events-none absolute inset-x-0 top-1/3 z-40 text-center font-pixel text-lg text-amber battle-draw-lightning">
          DRAW
        </p>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 text-center">
        {!showRecap && (
          <>
            <p
              className={`font-pixel text-lg transition-all duration-300 ${
                showOutcome
                  ? challengerWon
                    ? 'scale-100 text-phosphor opacity-100'
                    : isTie
                      ? 'scale-100 text-amber opacity-100'
                      : 'scale-100 text-red-500 opacity-100'
                  : 'scale-90 opacity-0'
              }`}
              style={{
                textShadow: challengerWon
                  ? '0 0 12px rgba(39,255,125,0.8)'
                  : '0 0 12px rgba(255,60,60,0.8)',
              }}
            >
              {isTie ? 'DRAW' : challengerWon ? 'VICTORY' : 'DEFEATED'}
            </p>
            <p className="mt-2 font-pixel text-sm text-amber">+{displayPoints}</p>
          </>
        )}
        <p className="mt-1 font-term text-sm text-bone/60">Battle #{battleId.slice(0, 8)}</p>
      </div>

      {showRecap && (
        <div className="mt-4 space-y-4">
          <BattleRecapCard
            challenger={challenger}
            opponent={opponent}
            resolution={resolution}
            challengerWon={challengerWon}
            isTie={isTie}
            pointsBefore={pointsBefore}
            pointsAfter={pointsAfter}
          />
          {!challengerWon && !isTie && (
            <div className="flex justify-center gap-2">
              {isBossBattle ? (
                <Link href="/wallet-wars/boss-gauntlet" className="chip-btn-amber battle-rematch-pulse">
                  RETRY BOSS?
                </Link>
              ) : (
                <Link href="/wallet-wars" className="chip-btn-amber battle-rematch-pulse">
                  REMATCH?
                </Link>
              )}
            </div>
          )}
          <div className="flex justify-center">
            <button
              type="button"
              className="arcade-btn"
              onClick={() => onDoneRef.current()}
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
