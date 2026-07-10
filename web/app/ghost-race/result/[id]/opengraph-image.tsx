import { ImageResponse } from 'next/og';
import { getServiceClient } from '@/lib/supabaseServer';
import { getGhostRaceRun } from '@/lib/ghost-race/ghostRace.server';
import {
  GHOST_CHAINS,
  formatFeeUsd,
  formatRaceDuration,
  ghostProgress,
} from '@/lib/ghost-race/ghostChains';

export const runtime = 'edge';
export const alt = 'GleanAI Ghost Race';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadRun(id: string) {
  try {
    const supabase = getServiceClient();
    return await getGhostRaceRun(supabase, id);
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: { id: string } }) {
  const run = await loadRun(params.id);
  const durationMs = run?.duration_ms ?? 0;
  const time = durationMs ? formatRaceDuration(durationMs) : '—';
  const feeUsd = run?.fee_usd != null ? Number(run.fee_usd) : null;
  const ethPct = Math.round(
    ghostProgress(durationMs, GHOST_CHAINS.eth.medianConfirmMs) * 100
  );
  const btcPct = Math.round(
    ghostProgress(durationMs, GHOST_CHAINS.btc.medianConfirmMs) * 100
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#05060a',
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(43,217,255,0.22), transparent 60%)',
          color: '#e7ece5',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 8,
            color: '#7d8694',
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          GHOST RACE · GLEANAI
        </div>

        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            marginTop: 24,
            color: '#39ff7a',
            display: 'flex',
          }}
        >
          {time}
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 28,
            color: '#ffb347',
            display: 'flex',
          }}
        >
          Fee {formatFeeUsd(feeUsd)}
        </div>

        <div
          style={{
            marginTop: 36,
            display: 'flex',
            gap: 40,
            fontSize: 24,
          }}
        >
          <div style={{ color: '#2bd9ff', display: 'flex' }}>
            ETH ghost {ethPct}%
          </div>
          <div style={{ color: '#ff3da6', display: 'flex' }}>
            BTC ghost {btcPct}%
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 18,
            color: '#7d8694',
            display: 'flex',
          }}
        >
          Real Solana memo tx · {GHOST_CHAINS.eth.citation}
        </div>
      </div>
    ),
    { ...size }
  );
}
