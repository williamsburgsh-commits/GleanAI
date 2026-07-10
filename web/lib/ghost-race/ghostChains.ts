/** Cited median confirmation times for ghost cars (not live oracles). */
export const GHOST_CHAINS = {
  eth: {
    id: 'eth' as const,
    label: 'ETHEREUM',
    shortLabel: 'ETH',
    medianConfirmMs: 12_000,
    citation: '~12s Ethereum block time',
  },
  btc: {
    id: 'btc' as const,
    label: 'BITCOIN',
    shortLabel: 'BTC',
    medianConfirmMs: 600_000,
    citation: '~10 min Bitcoin block time',
  },
} as const;

export type GhostChainId = keyof typeof GHOST_CHAINS;

export function ghostProgress(elapsedMs: number, medianConfirmMs: number): number {
  if (medianConfirmMs <= 0) return 1;
  return Math.min(1, Math.max(0, elapsedMs / medianConfirmMs));
}

export function formatRaceDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 10) return `${sec.toFixed(2)}s`;
  return `${sec.toFixed(1)}s`;
}

export function formatFeeUsd(usd: number | null | undefined): string {
  if (usd == null || !Number.isFinite(usd)) return '—';
  if (usd < 0.01) return `$${usd.toFixed(5)}`;
  return `$${usd.toFixed(4)}`;
}

export function buildGhostRaceShareText(opts: {
  durationMs: number;
  feeUsd?: number | null;
  resultUrl: string;
  /** dial.to Blink invite — others can race from X/wallet */
  blinkUrl?: string;
}): string {
  const time = formatRaceDuration(opts.durationMs);
  const fee =
    opts.feeUsd != null && Number.isFinite(opts.feeUsd)
      ? ` Fee: ${formatFeeUsd(opts.feeUsd)}.`
      : '';
  const lines = [
    `I finished Ghost Race in ${time} on Solana.`,
    `Ethereum's ghost is still pending.${fee}`,
    opts.resultUrl,
  ];
  if (opts.blinkUrl) {
    lines.push(`Race me: ${opts.blinkUrl}`);
  }
  return lines.join('\n');
}
