'use client';

import { useEffect, useState } from 'react';
import type { FighterCardData } from '../FighterCard';

export interface BossMeta {
  name: string;
  title: string;
  introLine: string;
  tier: string;
}

interface BossEntranceProps {
  active: boolean;
  boss: BossMeta;
  opponent: FighterCardData;
  onComplete: () => void;
}

type IntroStep = 'vignette' | 'title' | 'reveal' | 'taunt' | 'accepted' | 'done';

export function BossEntrance({ active, boss, opponent, onComplete }: BossEntranceProps) {
  const [step, setStep] = useState<IntroStep>('vignette');
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!active) {
      setStep('vignette');
      setTyped('');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStep('title'), 400));
    timers.push(setTimeout(() => setStep('reveal'), 1100));
    timers.push(setTimeout(() => setStep('taunt'), 1900));
    timers.push(setTimeout(() => setStep('accepted'), 2800));
    timers.push(setTimeout(() => {
      setStep('done');
      onComplete();
    }, 3200));

    return () => timers.forEach(clearTimeout);
  }, [active, onComplete]);

  useEffect(() => {
    if (step !== 'taunt') return;
    const line = boss.introLine;
    let i = 0;
    setTyped('');
    const id = setInterval(() => {
      i += 1;
      setTyped(line.slice(0, i));
      if (i >= line.length) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [step, boss.introLine]);

  if (!active || step === 'done') return null;

  return (
    <div
      className={`boss-entrance-overlay pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center px-4 ${
        step === 'vignette' ? 'boss-entrance-shake' : ''
      }`}
      aria-live="polite"
    >
      <div className="boss-entrance-vignette absolute inset-0" aria-hidden />

      {(step === 'title' || step === 'reveal' || step === 'taunt' || step === 'accepted') && (
        <p className="boss-entrance-title relative z-10 font-pixel text-[11px] tracking-widest text-magenta glow-magenta">
          BOSS GAUNTLET
        </p>
      )}

      {(step === 'reveal' || step === 'taunt' || step === 'accepted') && (
        <div className="boss-entrance-reveal relative z-10 mt-6 text-center">
          <p className="font-pixel text-lg text-amber glow-amber">{boss.name}</p>
          <p className="mt-1 font-term text-sm text-bone/80">{boss.title}</p>
          <div className="boss-entrance-card mx-auto mt-4 h-24 w-20 overflow-hidden rounded border-2 border-magenta/60 bg-[#0d1219]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={opponent.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      )}

      {(step === 'taunt' || step === 'accepted') && (
        <p className="relative z-10 mt-6 max-w-xs text-center font-term text-sm text-bone min-h-[2.5rem]">
          &ldquo;{typed}&rdquo;
          {step === 'taunt' && <span className="animate-blink">|</span>}
        </p>
      )}

      {step === 'accepted' && (
        <p className="boss-entrance-accepted relative z-10 mt-4 font-pixel text-[10px] text-phosphor glow-text">
          CHALLENGE ACCEPTED
        </p>
      )}
    </div>
  );
}
