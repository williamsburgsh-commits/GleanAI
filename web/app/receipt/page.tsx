'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CrtPanel } from '@/components/CrtPanel';
import { ConnectButton } from '@/components/ConnectButton';
import { ReceiptPrinter } from '@/components/receipt/ReceiptPrinter';
import type { ReceiptData } from '@/components/receipt/ReceiptPaper';
import { useTelegram } from '@/components/TelegramProvider';
import { getPublicConfig } from '@/lib/config';
import { clusterLabel, resolveReceiptScanCluster } from '@/lib/solana/cluster';
import { getStoredWallet, getTelegramId } from '@/lib/phantom';
import { captureTelegramIdFromUrl } from '@/lib/resolvePlayer';
import { PixelArrowLeft } from '@/components/PixelArt';

type Phase = 'idle' | 'printing' | 'submitting' | 'done';

const PROGRESS_TICKS = [
  'SCANNING SIGNATURES...',
  'SUMMING FEES...',
  'COMPARING TO ETHEREUM...',
  'PRINTING RECEIPT...',
];

export default function ReceiptPage() {
  const router = useRouter();
  const { cluster } = getPublicConfig();
  const networkLabel = clusterLabel(resolveReceiptScanCluster(cluster));
  const { inTelegram, webApp, player } = useTelegram();

  const [wallet, setWallet] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);
  const [previewData, setPreviewData] = useState<ReceiptData | null>(null);

  const homeHref = inTelegram ? '/app' : '/play';

  const haptic = useCallback(
    (type: 'success' | 'error' | 'warning') => {
      try {
        webApp?.HapticFeedback?.notificationOccurred(type);
      } catch {
        /* noop */
      }
    },
    [webApp]
  );

  useEffect(() => {
    captureTelegramIdFromUrl();
    const linked = getStoredWallet() || player?.walletAddress || null;
    setWallet(linked);
    setReady(true);

    function refresh() {
      setWallet(getStoredWallet() || player?.walletAddress || null);
    }
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [player?.walletAddress]);

  useEffect(() => {
    if (phase !== 'submitting' && phase !== 'printing') return;
    const interval = setInterval(() => {
      setProgressIdx((i) => (i + 1) % PROGRESS_TICKS.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [phase]);

  async function onPrint() {
    const w = getStoredWallet();
    if (!w) return;

    setError(null);
    setPhase('printing');
    setProgressIdx(0);

    const telegramId = player?.telegramId ?? getTelegramId();

    try {
      const res = await fetch('/api/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: w,
          cluster,
          ...(telegramId ? { telegramId } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not print receipt.');
      }

      setPreviewData({
        walletAddress: w,
        txCount: data.txCount,
        txCountCapped: data.txCountCapped,
        solFeesUsd: data.solFeesUsd,
        ethEstimateUsd: data.ethEstimateUsd,
        savingsUsd: data.savingsUsd,
        walletAgeDays: data.walletAgeDays ?? 0,
        isFeeExtrapolated: data.isFeeExtrapolated ?? false,
        networkLabel: data.networkLabel ?? networkLabel,
      });

      setPhase('submitting');
      haptic('success');

      // Brief print animation then redirect to share page.
      setTimeout(() => {
        setPhase('done');
        router.push(data.resultUrl);
      }, 1800);
    } catch (err) {
      setPhase('idle');
      setPreviewData(null);
      haptic('error');
      setError(err instanceof Error ? err.message : 'Print failed.');
    }
  }

  const busy = phase === 'printing' || phase === 'submitting' || phase === 'done';

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-8">
      <Link
        href={homeHref}
        className="mb-6 inline-flex items-center gap-2 font-term text-[15px] uppercase tracking-[0.15em] text-ash hover:text-bone"
      >
        <span className="h-4 w-4">
          <PixelArrowLeft />
        </span>
        back to hub
      </Link>

      <CrtPanel label="THE RECEIPT // FEE PRINTER" tone="amber">
        <div className="space-y-6 py-4 text-center">
          <p className="font-term text-[17px] leading-snug text-ash">
            Print your lifetime Solana fee receipt. Real on-chain data. Compare
            what you paid vs what Ethereum would have cost.
          </p>

          {!ready ? null : !wallet ? (
            <div className="space-y-4">
              <p className="font-term text-[16px] text-amber">
                {inTelegram
                  ? 'Connect Phantom in your phone browser to print your receipt.'
                  : 'Connect Phantom to print your receipt.'}
              </p>
              <ConnectButton cluster={cluster} label="Connect Wallet" returnPath="/receipt" />
              {inTelegram ? (
                <button
                  type="button"
                  className="chip-btn-cyan"
                  onClick={() => {
                    captureTelegramIdFromUrl();
                    setWallet(getStoredWallet() || player?.walletAddress || null);
                  }}
                >
                  I connected — refresh
                </button>
              ) : null}
            </div>
          ) : (
            <p className="font-term text-[14px] uppercase tracking-[0.2em] text-phosphor">
              wallet: {wallet.slice(0, 4)}…{wallet.slice(-4)}
            </p>
          )}

          {previewData && (phase === 'printing' || phase === 'submitting') && (
            <ReceiptPrinter data={previewData} animate onComplete={() => {}} />
          )}

          {phase === 'printing' && !previewData && (
            <p className="font-term text-[15px] uppercase tracking-[0.2em] text-amber animate-pulse">
              {PROGRESS_TICKS[progressIdx]}
            </p>
          )}

          {error && (
            <p className="font-term text-[16px] text-magenta">{error}</p>
          )}

          {wallet && (
            <button
              type="button"
              className="arcade-btn"
              disabled={busy}
              onClick={onPrint}
            >
              {busy ? 'PRINTING...' : 'PRINT RECEIPT'}
            </button>
          )}

          <p className="font-term text-[12px] uppercase tracking-[0.15em] text-ash">
            scanning {networkLabel} · one fresh scan per wallet every 24h · estimates only
          </p>
        </div>
      </CrtPanel>
    </main>
  );
}
