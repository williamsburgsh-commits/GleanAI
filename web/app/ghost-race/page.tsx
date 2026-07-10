'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { CrtPanel } from '@/components/CrtPanel';
import { ConnectButton } from '@/components/ConnectButton';
import { ShareButton } from '@/components/ShareButton';
import { RaceTrack } from '@/components/ghost-race/RaceTrack';
import { useTelegram } from '@/components/TelegramProvider';
import { PixelArrowLeft, PixelGhost } from '@/components/PixelArt';
import { getPublicConfig } from '@/lib/config';
import { clusterLabel, normalizeCluster } from '@/lib/solana/cluster';
import { buildGhostRaceMemoTransaction } from '@/lib/solana/memoTx';
import { confirmSignature } from '@/lib/solana/confirmSignature';
import {
  GHOST_CHAINS,
  buildGhostRaceShareText,
  formatFeeUsd,
  formatRaceDuration,
} from '@/lib/ghost-race/ghostChains';
import { ghostRaceBlinkUrl } from '@/lib/actions/blinkUrl';
import {
  getPhantomProvider,
  getStoredWallet,
  getTelegramId,
} from '@/lib/phantom';
import { captureTelegramIdFromUrl } from '@/lib/resolvePlayer';

type Phase = 'idle' | 'signing' | 'racing' | 'saving' | 'done' | 'error';

interface RaceResult {
  runId: string;
  resultUrl: string;
  durationMs: number;
  feeUsd: number | null;
  explorerUrl: string;
  slot: number | null;
  rank: number | null;
  total: number;
}

interface BoardRow {
  id: string;
  walletAddress: string;
  durationMs: number;
}

function shortWallet(addr: string): string {
  if (addr.length < 8) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function newRaceNonce(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function GhostRacePage() {
  const { inTelegram, webApp, player } = useTelegram();
  const { cluster } = getPublicConfig();
  const networkLabel = clusterLabel(normalizeCluster(cluster));
  const homeHref = inTelegram ? '/app' : '/play';

  const [wallet, setWallet] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [solProgress, setSolProgress] = useState(0);
  const [result, setResult] = useState<RaceResult | null>(null);
  const [personalBestMs, setPersonalBestMs] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<BoardRow[]>([]);

  const rafRef = useRef<number | null>(null);
  const t0Ref = useRef(0);

  const resolveWallet = useCallback((): string | null => {
    return getStoredWallet() || player?.walletAddress || null;
  }, [player?.walletAddress]);

  const loadBoard = useCallback(async (w: string | null) => {
    try {
      const q = w ? `?wallet=${encodeURIComponent(w)}` : '';
      const res = await fetch(`/api/ghost-race${q}`);
      if (!res.ok) return;
      const data = await res.json();
      setLeaderboard(data.leaderboard ?? []);
      setPersonalBestMs(data.personalBest?.durationMs ?? null);
    } catch {
      /* best-effort */
    }
  }, []);

  useEffect(() => {
    captureTelegramIdFromUrl();
    const w = resolveWallet();
    setWallet(w);
    setReady(true);
    void loadBoard(w);

    function refresh() {
      const next = resolveWallet();
      setWallet(next);
      void loadBoard(next);
    }
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [resolveWallet, loadBoard]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function startClock() {
    t0Ref.current = performance.now();
    setElapsedMs(0);
    setSolProgress(0);

    const tick = () => {
      const elapsed = performance.now() - t0Ref.current;
      setElapsedMs(elapsed);
      // Solana car eases toward finish; snaps to 1 on confirm
      setSolProgress((prev) => {
        if (prev >= 1) return 1;
        // Soft approach: reach ~0.85 by 2s if still racing
        return Math.min(0.92, elapsed / 2200);
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function stopClock(): number {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const elapsed = performance.now() - t0Ref.current;
    setElapsedMs(elapsed);
    setSolProgress(1);
    return elapsed;
  }

  async function onIgnition() {
    setError(null);
    setResult(null);

    const w = resolveWallet();
    if (!w) {
      setError('Connect Phantom to race.');
      return;
    }

    const provider = getPhantomProvider();
    if (!provider) {
      if (inTelegram && webApp?.openLink) {
        const url = `${window.location.origin}/ghost-race`;
        webApp.openLink(url);
        setError('Open Ghost Race in your browser with Phantom to sign.');
        return;
      }
      setError('Phantom wallet not found. Install or open in a browser with Phantom.');
      return;
    }

    setPhase('signing');
    const raceNonce = newRaceNonce();

    try {
      const rpcCluster = normalizeCluster(cluster);
      const endpoint =
        rpcCluster === 'devnet'
          ? clusterApiUrl('devnet')
          : clusterApiUrl('mainnet-beta');
      const connection = new Connection(endpoint, 'confirmed');
      const payer = new PublicKey(w);

      const { transaction } = await buildGhostRaceMemoTransaction({
        connection,
        payer,
        raceNonce,
      });

      const { signature } = await provider.signAndSendTransaction(transaction);

      setPhase('racing');
      startClock();

      const { slot } = await confirmSignature(connection, signature, {
        timeoutMs: 30_000,
        pollMs: 200,
      });

      const durationMs = stopClock();
      setPhase('saving');

      const tg = getTelegramId();
      const res = await fetch('/api/ghost-race', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: tg || undefined,
          walletAddress: w,
          signature,
          raceNonce,
          durationMs: Math.round(durationMs),
          slot,
          cluster: rpcCluster,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save race');

      const raceResult: RaceResult = {
        runId: data.runId,
        resultUrl: data.resultUrl,
        durationMs: data.durationMs ?? Math.round(durationMs),
        feeUsd: data.feeUsd ?? null,
        explorerUrl: data.explorerUrl,
        slot: data.slot ?? slot,
        rank: data.rank ?? null,
        total: data.total ?? 0,
      };
      setResult(raceResult);
      setPhase('done');
      void loadBoard(w);
    } catch (e) {
      stopClock();
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Race failed');
    }
  }

  function onRaceAgain() {
    setPhase('idle');
    setError(null);
    setResult(null);
    setElapsedMs(0);
    setSolProgress(0);
  }

  const racing = phase === 'racing' || phase === 'signing' || phase === 'saving';
  const showTrack =
    phase === 'signing' ||
    phase === 'racing' ||
    phase === 'saving' ||
    phase === 'done' ||
    phase === 'error';

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Link
        href={homeHref}
        className="mb-4 inline-flex items-center gap-2 font-pixel text-[9px] text-cyan"
      >
        <span className="inline-block h-4 w-4">
          <PixelArrowLeft />
        </span>
        EXIT
      </Link>

      <CrtPanel label="GHOST RACE // SOLANA VS THE CHAINS" tone="cyan">
        <div className="mb-4 flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 text-cyan">
            <PixelGhost />
          </div>
          <div>
            <p className="font-term text-sm text-bone">
              Hit IGNITION to send a real Solana memo tx. Watch ETH and BTC ghosts
              crawl while you confirm.
            </p>
            <p className="mt-1 font-term text-xs text-ash">
              Network: {networkLabel} · ETH {GHOST_CHAINS.eth.citation} · BTC{' '}
              {GHOST_CHAINS.btc.citation}
            </p>
          </div>
        </div>

        {!ready ? (
          <p className="font-term animate-blink text-phosphor">LOADING…</p>
        ) : !wallet ? (
          <div className="space-y-3">
            <p className="font-term text-sm text-amber">Connect Phantom to race.</p>
            <ConnectButton cluster={cluster} returnPath="/ghost-race" />
          </div>
        ) : (
          <>
            <p className="mb-3 font-term text-xs text-ash">
              Wallet {shortWallet(wallet)}
              {personalBestMs != null
                ? ` · PB ${formatRaceDuration(personalBestMs)}`
                : ''}
            </p>

            {showTrack && (
              <div className="mb-4">
                <RaceTrack
                  elapsedMs={elapsedMs}
                  finished={phase === 'done' || phase === 'saving'}
                  solProgress={
                    phase === 'done' || phase === 'saving' ? 1 : solProgress
                  }
                />
                {(racing || phase === 'done') && (
                  <p className="mt-2 text-center font-pixel text-sm text-phosphor">
                    {formatRaceDuration(result?.durationMs ?? elapsedMs)}
                  </p>
                )}
              </div>
            )}

            {phase === 'idle' && (
              <button
                type="button"
                className="arcade-btn w-full"
                onClick={onIgnition}
              >
                IGNITION
              </button>
            )}

            {phase === 'signing' && (
              <p className="font-term animate-blink text-amber">
                APPROVE IN PHANTOM…
              </p>
            )}
            {phase === 'racing' && (
              <p className="font-term animate-blink text-cyan">
                CONFIRMING ON SOLANA…
              </p>
            )}
            {phase === 'saving' && (
              <p className="font-term animate-blink text-phosphor">
                SAVING RESULT…
              </p>
            )}

            {phase === 'done' && result && (
              <div className="space-y-4 text-center">
                <p className="font-pixel text-lg text-phosphor">YOU FINISHED</p>
                <p className="font-pixel text-2xl text-phosphor glow-text">
                  {formatRaceDuration(result.durationMs)}
                </p>
                <p className="font-term text-sm text-amber">
                  Fee {formatFeeUsd(result.feeUsd)}
                  {result.slot != null ? ` · Slot ${result.slot}` : ''}
                </p>
                <p className="font-term text-xs text-ash">
                  ETH ghost at{' '}
                  {Math.round(
                    Math.min(
                      100,
                      (result.durationMs / GHOST_CHAINS.eth.medianConfirmMs) * 100
                    )
                  )}
                  % · BTC barely moved
                </p>
                {result.rank != null && (
                  <p className="font-term text-xs text-magenta">
                    Rank #{result.rank}
                    {result.total ? ` of ${result.total}` : ''}
                  </p>
                )}
                <ShareButton
                  variant="compact"
                  url={result.resultUrl}
                  text={`I finished Ghost Race in ${formatRaceDuration(result.durationMs)} on Solana.`}
                  twitterText={buildGhostRaceShareText({
                    durationMs: result.durationMs,
                    feeUsd: result.feeUsd,
                    resultUrl: result.resultUrl,
                    blinkUrl: ghostRaceBlinkUrl(),
                  })}
                />
                <a
                  href={result.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-term text-xs text-cyan underline"
                >
                  View on explorer
                </a>
                <button
                  type="button"
                  className="chip-btn w-full text-center"
                  onClick={onRaceAgain}
                >
                  RACE AGAIN
                </button>
              </div>
            )}

            {(phase === 'error' || error) && (
              <div className="mt-3 space-y-3">
                <p className="font-term text-sm text-magenta">{error}</p>
                <button
                  type="button"
                  className="arcade-btn w-full"
                  onClick={onRaceAgain}
                >
                  TRY AGAIN
                </button>
              </div>
            )}
          </>
        )}
      </CrtPanel>

      {leaderboard.length > 0 && (
        <CrtPanel label="PERSONAL BEST // LEADERBOARD" tone="amber" className="mt-4">
          <ul className="space-y-2">
            {leaderboard.map((row, i) => (
              <li
                key={row.id}
                className="flex items-center justify-between font-term text-sm"
              >
                <span className="text-ash">
                  #{i + 1} {shortWallet(row.walletAddress)}
                </span>
                <span className="font-pixel text-[10px] text-phosphor">
                  {formatRaceDuration(row.durationMs)}
                </span>
              </li>
            ))}
          </ul>
        </CrtPanel>
      )}

      {inTelegram && (
        <p className="mt-4 font-term text-xs text-ash">
          Phantom signing works best in an external browser. Tap IGNITION to open
          one if needed.
        </p>
      )}
    </main>
  );
}
