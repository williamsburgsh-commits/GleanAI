'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CrtPanel } from '@/components/CrtPanel';
import { useTelegram } from '@/components/TelegramProvider';
import { getTelegramId } from '@/lib/phantom';
import { SPRINT_ACTIONS, TOTAL_ACTIONS } from '@/lib/sprintActions';
import { formatDuration } from '@/lib/format';

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
        <Link
          href={homeHref}
          className="crt-tag border-phosphor/40 bg-phosphor/10 text-phosphor transition-colors hover:bg-phosphor/20"
        >
          ◂ Menu
        </Link>
        <span className="font-display text-xs text-phosphor glow-text">
          GLEAN<span className="text-magenta">AI</span>
        </span>
        <span className="crt-tag border-magenta/40 bg-magenta/10 text-magenta">
          SPRINT
        </span>
      </header>

      {/* Timer */}
      <div className="mb-6 text-center">
        <div
          className={`font-display text-4xl sm:text-5xl ${
            phase === 'running' ? 'text-amber glow-text' : 'text-phosphor glow-text'
          }`}
        >
          {formatDuration(phase === 'done' && finalMs ? finalMs : elapsed)}
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-ash">
          {phase === 'running'
            ? `action ${step + 1} / ${TOTAL_ACTIONS}`
            : 'speedrun timer'}
        </div>
      </div>

      {phase === 'idle' ? (
        <CrtPanel label="MISSION BRIEFING" tone="magenta">
          <p className="mb-4 text-sm text-ash">
            Onboard to Solana as fast as you can. Five actions will flash on
            screen - tap the matching tile for each, in order. The clock is
            running. Beat your best.
          </p>
          <ol className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {SPRINT_ACTIONS.map((a, i) => (
              <li
                key={a.key}
                className="rounded-sm border border-grid bg-slate/60 p-2 text-center"
              >
                <div className="font-display text-[10px] text-magenta">
                  0{i + 1}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-bone">
                  {a.label}
                </div>
              </li>
            ))}
          </ol>
          <div className="text-center">
            <button className="arcade-btn" onClick={start}>
              <span className="text-magenta">▸</span> Start Sprint
              <span className="animate-blink">_</span>
            </button>
          </div>
        </CrtPanel>
      ) : null}

      {phase === 'running' ? (
        <CrtPanel label="TAP THE MATCHING ACTION" tone="phosphor">
          <div className="mb-5 text-center">
            <div className="text-[10px] uppercase tracking-[0.3em] text-ash">
              now
            </div>
            <div className="font-display text-xl text-phosphor glow-text">
              {SPRINT_ACTIONS[step].label}
            </div>
            <div className="mt-1 text-[11px] text-ash">
              {SPRINT_ACTIONS[step].hint}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiles.map((t) => (
              <button
                key={t.key}
                onClick={() => onTile(t.key)}
                className="rounded-sm border-2 border-grid bg-slate/60 px-3 py-4 text-xs font-bold uppercase tracking-wider text-bone transition-all hover:border-phosphor hover:bg-phosphor/10 hover:text-phosphor active:translate-y-0.5"
              >
                {t.label}
              </button>
            ))}
          </div>
          {misses > 0 ? (
            <p className="mt-4 text-center text-[11px] text-magenta">
              misses: {misses}
            </p>
          ) : null}
        </CrtPanel>
      ) : null}

      {phase === 'submitting' ? (
        <CrtPanel label="SAVING RUN" tone="cyan">
          <p className="py-4 text-center font-display text-[11px] text-cyan glow-text">
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
            <div>
              <div className="font-display text-3xl text-phosphor glow-text">
                {finalMs ? formatDuration(finalMs) : '--'}
              </div>
              <p className="mt-2 text-sm text-bone">
                Onboarded in {finalMs ? formatDuration(finalMs) : '--'}
              </p>
              {misses > 0 ? (
                <p className="text-[11px] text-ash">with {misses} miss(es)</p>
              ) : null}
            </div>

            {noProfile ? (
              <div className="space-y-3">
                <p className="text-xs text-amber">
                  Nice run! Open GleanAI from the Telegram bot to save your time,
                  earn points, and get a shareable card.
                </p>
                <Link href={homeHref} className="arcade-btn">
                  ◂ Back to menu
                </Link>
              </div>
            ) : error ? (
              <p className="text-xs text-magenta">{error}</p>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button className="arcade-btn" onClick={share}>
                  {copied ? 'Link copied!' : 'Share result'}
                </button>
                {resultUrl ? (
                  <Link
                    href={resultUrl}
                    className="text-[11px] uppercase tracking-wider text-cyan underline"
                  >
                    view card
                  </Link>
                ) : null}
                <Link
                  href={homeHref}
                  className="text-[11px] uppercase tracking-[0.25em] text-ash hover:text-phosphor"
                >
                  ◂ menu
                </Link>
              </div>
            )}

            <div>
              <button
                onClick={start}
                className="text-[11px] uppercase tracking-[0.25em] text-ash hover:text-phosphor"
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
