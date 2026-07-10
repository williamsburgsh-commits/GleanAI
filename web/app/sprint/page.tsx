'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CrtPanel } from '@/components/CrtPanel';
import { BrandMark } from '@/components/BrandMark';
import { useTelegram } from '@/components/TelegramProvider';
import { getTelegramId } from '@/lib/phantom';
import { SPRINT_ACTIONS, TOTAL_ACTIONS } from '@/lib/sprintActions';
import { formatDuration } from '@/lib/format';
import {
  PixelArrowLeft,
  PixelBolt,
  PixelWallet,
  PixelCoin,
  PixelSwap,
  PixelStake,
  PixelNft,
  PixelCheck,
} from '@/components/PixelArt';

// Decorative sprite per sprint action key (presentation only).
const SPRITE_BY_KEY: Record<string, typeof PixelWallet> = {
  wallet: PixelWallet,
  sol: PixelCoin,
  swap: PixelSwap,
  stake: PixelStake,
  nft: PixelNft,
};

type Phase = 'idle' | 'running' | 'submitting' | 'done';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SprintPage() {
  const { inTelegram } = useTelegram();
  const homeHref = inTelegram ? '/app' : '/play';

  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [misses, setMisses] = useState(0);
  const [tiles, setTiles] = useState(() => shuffle(SPRINT_ACTIONS));
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [finalMs, setFinalMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [copied, setCopied] = useState(false);

  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    setElapsed(performance.now() - startRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function start() {
    setError(null);
    setStep(0);
    setMisses(0);
    setElapsed(0);
    setResultUrl(null);
    setFinalMs(null);
    setNoProfile(false);
    setTiles(shuffle(SPRINT_ACTIONS));
    setPhase('running');
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }

  async function finish(durationMs: number) {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setFinalMs(durationMs);

    const telegramId = getTelegramId();
    // No linked player: let them enjoy the result locally, prompt to connect.
    if (!telegramId) {
      setNoProfile(true);
      setPhase('done');
      return;
    }

    setPhase('submitting');
    try {
      const res = await fetch('/api/sprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: telegramId ?? undefined,
          durationMs: Math.round(durationMs),
          actionsCompleted: TOTAL_ACTIONS,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save your run.');
      setResultUrl(data.resultUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your run.');
    } finally {
      setPhase('done');
    }
  }

  function onTile(key: string) {
    if (phase !== 'running') return;
    const expected = SPRINT_ACTIONS[step].key;
    if (key !== expected) {
      setMisses((m) => m + 1);
      return;
    }
    const next = step + 1;
    if (next >= TOTAL_ACTIONS) {
      finish(performance.now() - startRef.current);
      return;
    }
    setStep(next);
    setTiles(shuffle(SPRINT_ACTIONS));
  }

  async function share() {
    if (!resultUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'GleanAI // Solana Sprint',
          text: finalMs ? `I onboarded to Solana in ${formatDuration(finalMs)}!` : '',
          url: resultUrl,
        });
      } else {
        await navigator.clipboard.writeText(resultUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user cancelled share - ignore */
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link href={homeHref} className="crt-tag" style={{ borderColor: '#27ff7d', color: '#27ff7d' }}>
          <span className="h-3 w-3"><PixelArrowLeft /></span>
          Menu
        </Link>
        <BrandMark href={homeHref} />
        <span className="crt-tag" style={{ borderColor: '#ff3da6', color: '#ff3da6' }}>
          SPRINT
        </span>
      </header>

      {/* Timer — the only "live" readout, so it gets the phosphor glow */}
      <div className="mb-6 text-center">
        <div
          className={`font-pixel text-3xl sm:text-5xl ${
            phase === 'running' ? 'text-amber glow-amber' : 'text-phosphor glow-text'
          }`}
        >
          {formatDuration(phase === 'done' && finalMs ? finalMs : elapsed)}
        </div>
        <div className="mt-2 font-term text-[15px] uppercase tracking-[0.2em] text-ash">
          {phase === 'running'
            ? `action ${step + 1} / ${TOTAL_ACTIONS}`
            : 'speedrun timer'}
        </div>
      </div>

      {phase === 'idle' ? (
        <CrtPanel label="MISSION BRIEFING" tone="magenta">
          <p className="mb-4 font-term text-[18px] leading-snug text-ash">
            Onboard to Solana as fast as you can. Five actions will flash on
            screen - tap the matching tile for each, in order. The clock is
            running. Beat your best.
          </p>
          <ol className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {SPRINT_ACTIONS.map((a, i) => {
              const Sprite = SPRITE_BY_KEY[a.key] ?? PixelBolt;
              return (
                <li key={a.key} className="stage-tile">
                  <div className="mx-auto mb-2 h-7 w-7 text-phosphor">
                    <Sprite />
                  </div>
                  <div className="font-pixel text-[10px] text-magenta">0{i + 1}</div>
                  <div className="mt-2 font-term text-[14px] uppercase tracking-[0.1em] text-bone">
                    {a.label}
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="text-center">
            <button className="arcade-btn" onClick={start}>
              <span className="h-3 w-3 text-phosphor"><PixelBolt /></span>
              Start Sprint
              <span className="animate-blink">_</span>
            </button>
          </div>
        </CrtPanel>
      ) : null}

      {phase === 'running' ? (
        <CrtPanel label="TAP THE MATCHING ACTION" tone="phosphor">
          <div className="mb-5 text-center">
            <div className="font-term text-[15px] uppercase tracking-[0.2em] text-ash">
              now
            </div>
            <div className="mt-1 flex items-center justify-center gap-3">
              {(() => {
                const Sprite = SPRITE_BY_KEY[SPRINT_ACTIONS[step].key] ?? PixelBolt;
                return (
                  <span className="h-8 w-8 text-phosphor glow-text">
                    <Sprite />
                  </span>
                );
              })()}
              <span className="font-pixel text-base text-phosphor glow-text sm:text-xl">
                {SPRINT_ACTIONS[step].label}
              </span>
            </div>
            <div className="mt-2 font-term text-[16px] text-ash">
              {SPRINT_ACTIONS[step].hint}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiles.map((t) => {
              const Sprite = SPRITE_BY_KEY[t.key] ?? PixelBolt;
              return (
                <button
                  key={t.key}
                  onClick={() => onTile(t.key)}
                  className="stage-tile hover-glitch flex flex-col items-center gap-2 px-3 py-4"
                >
                  <span className="h-8 w-8 text-bone">
                    <Sprite />
                  </span>
                  <span className="font-pixel text-[11px] uppercase tracking-[0.1em] text-bone">
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
          {misses > 0 ? (
            <p className="mt-4 text-center font-term text-[16px] text-magenta glow-magenta">
              misses: {misses}
            </p>
          ) : null}
        </CrtPanel>
      ) : null}

      {phase === 'submitting' ? (
        <CrtPanel label="SAVING RUN" tone="cyan">
          <p className="py-4 text-center font-pixel text-[11px] text-cyan glow-cyan">
            UPLOADING TIME<span className="animate-blink"> _</span>
          </p>
        </CrtPanel>
      ) : null}

      {phase === 'done' ? (
        <CrtPanel
          label={error ? 'RUN SAVED (LOCAL)' : 'RUN COMPLETE'}
          tone={error ? 'amber' : 'phosphor'}
        >
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto mb-2 h-10 w-10 text-phosphor glow-text">
              <PixelCheck />
            </div>
            <div>
              <div className="font-pixel text-3xl text-phosphor glow-text">
                {finalMs ? formatDuration(finalMs) : '--'}
              </div>
              <p className="mt-2 font-term text-[18px] text-bone">
                Onboarded in {finalMs ? formatDuration(finalMs) : '--'}
              </p>
              {misses > 0 ? (
                <p className="font-term text-[16px] text-ash">with {misses} miss(es)</p>
              ) : null}
            </div>

            {noProfile ? (
              <div className="space-y-3">
                <p className="font-term text-[17px] text-amber">
                  Nice run! Open GleanAI from the Telegram bot to save your time,
                  earn points, and get a shareable card.
                </p>
                <Link href={homeHref} className="arcade-btn">
                  <span className="h-3 w-3 text-phosphor"><PixelArrowLeft /></span>
                  Back to menu
                </Link>
              </div>
            ) : error ? (
              <p className="font-term text-[17px] text-magenta">{error}</p>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button className="arcade-btn-cyan" onClick={share}>
                  {copied ? 'Link copied!' : 'Share result'}
                </button>
                {resultUrl ? (
                  <Link
                    href={resultUrl}
                    className="font-term text-[16px] uppercase tracking-[0.1em] text-cyan underline"
                  >
                    view card
                  </Link>
                ) : null}
                <Link
                  href={homeHref}
                  className="font-term text-[16px] uppercase tracking-[0.2em] text-ash hover:text-phosphor"
                >
                  ◂ menu
                </Link>
              </div>
            )}

            <div>
              <button
                onClick={start}
                className="font-term text-[16px] uppercase tracking-[0.2em] text-ash hover:text-phosphor"
              >
                ↻ run again
              </button>
            </div>
          </div>
        </CrtPanel>
      ) : null}
    </main>
  );
}
