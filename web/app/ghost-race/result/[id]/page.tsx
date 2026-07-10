import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CrtPanel } from '@/components/CrtPanel';
import { ShareButton } from '@/components/ShareButton';
import { PixelGhost, PixelTrophy } from '@/components/PixelArt';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  getGhostRaceRank,
  getGhostRaceRun,
} from '@/lib/ghost-race/ghostRace.server';
import {
  GHOST_CHAINS,
  buildGhostRaceShareText,
  formatFeeUsd,
  formatRaceDuration,
  ghostProgress,
} from '@/lib/ghost-race/ghostChains';
import { getPublicWebAppUrl } from '@/lib/publicWebAppUrl';
import { ghostRaceBlinkUrl } from '@/lib/actions/blinkUrl';
import { clusterLabel, normalizeCluster } from '@/lib/solana/cluster';

export const runtime = 'nodejs';

async function loadRun(id: string) {
  try {
    const supabase = getServiceClient();
    return await getGhostRaceRun(supabase, id);
  } catch (err) {
    console.error('[ghost-race/result] load error', err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const run = await loadRun(params.id);
  if (!run) {
    return { title: 'GleanAI // Ghost Race' };
  }
  const time = formatRaceDuration(run.duration_ms);
  const title = `Ghost Race ${time} — GleanAI`;
  const description = `Finished in ${time} on Solana. Ethereum's ghost is still pending.`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function GhostRaceResultPage({
  params,
}: {
  params: { id: string };
}) {
  const run = await loadRun(params.id);
  if (!run) notFound();

  const supabase = getServiceClient();
  let rank: number | null = null;
  let total = 0;
  try {
    const r = await getGhostRaceRank(supabase, run.duration_ms);
    rank = r.rank;
    total = r.total;
  } catch {
    /* best-effort */
  }

  const resultUrl =
    run.result_card_url ||
    `${getPublicWebAppUrl()}/ghost-race/result/${run.id}`;
  const feeUsd = run.fee_usd != null ? Number(run.fee_usd) : null;
  const ethPct = Math.round(
    ghostProgress(run.duration_ms, GHOST_CHAINS.eth.medianConfirmMs) * 100
  );
  const btcPct = Math.round(
    ghostProgress(run.duration_ms, GHOST_CHAINS.btc.medianConfirmMs) * 100
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <CrtPanel label="GHOST RACE // RESULT" tone="cyan">
        <div className="space-y-6 py-4 text-center">
          <div className="mx-auto h-12 w-12 text-cyan">
            <PixelGhost />
          </div>
          <p className="font-term text-[16px] uppercase tracking-[0.3em] text-ash">
            confirmed in
          </p>
          <p className="font-pixel text-4xl text-phosphor glow-text sm:text-6xl">
            {formatRaceDuration(run.duration_ms)}
          </p>

          <div className="mx-auto flex max-w-xs items-center justify-center gap-6">
            <div>
              <div className="font-pixel text-[13px] text-amber glow-amber">
                {formatFeeUsd(feeUsd)}
              </div>
              <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">
                fee
              </div>
            </div>
            <div className="h-8 w-px bg-grid" />
            <div>
              <div className="flex items-center justify-center gap-1 font-pixel text-[13px] text-magenta glow-magenta">
                <span className="h-3 w-3">
                  <PixelTrophy />
                </span>
                {rank ? `#${rank}` : '—'}
              </div>
              <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">
                {total ? `of ${total}` : 'rank'}
              </div>
            </div>
          </div>

          <p className="font-term text-sm text-bone">
            ETH ghost at {ethPct}% · BTC at {btcPct}%
          </p>
          <p className="font-term text-xs text-ash">
            {GHOST_CHAINS.eth.citation} · {GHOST_CHAINS.btc.citation}
          </p>
          {run.slot != null && (
            <p className="font-term text-xs text-ash">
              Slot {run.slot} · {clusterLabel(normalizeCluster(run.cluster))}
            </p>
          )}

          <ShareButton
            variant="compact"
            url={resultUrl}
            text={`I finished Ghost Race in ${formatRaceDuration(run.duration_ms)} on Solana.`}
            twitterText={buildGhostRaceShareText({
              durationMs: run.duration_ms,
              feeUsd,
              resultUrl,
              blinkUrl: ghostRaceBlinkUrl(),
            })}
          />

          <a
            href={ghostRaceBlinkUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-term text-xs text-cyan underline"
          >
            Race from wallet (Blink)
          </a>

          <a
            href={run.explorer_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-term text-xs text-cyan underline"
          >
            View on explorer
          </a>

          <Link href="/ghost-race" className="inline-block chip-btn">
            RACE AGAIN
          </Link>
        </div>
      </CrtPanel>
      <p className="mt-4 text-center font-term text-xs text-ash">
        Race #{params.id.slice(0, 8)}
      </p>
    </main>
  );
}
