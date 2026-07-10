import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  getLeaderboard,
  getPersonalBest,
} from '@/lib/ghost-race/ghostRace.server';
import { persistGhostRaceRun } from '@/lib/ghost-race/persistGhostRaceRun';

export const runtime = 'nodejs';
export const maxDuration = 30;

function isValidSolanaAddress(address: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

// GET /api/ghost-race?wallet=... — personal best + top leaderboard
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = (searchParams.get('wallet') || '').trim();

  let supabase;
  try {
    supabase = getServiceClient();
  } catch {
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const board = await getLeaderboard(supabase, 5);
    let personalBest = null;
    if (wallet && isValidSolanaAddress(wallet)) {
      personalBest = await getPersonalBest(supabase, wallet);
    }
    return NextResponse.json({
      leaderboard: board.map((r) => ({
        id: r.id,
        walletAddress: r.wallet_address,
        durationMs: r.duration_ms,
        feeUsd: r.fee_usd != null ? Number(r.fee_usd) : null,
      })),
      personalBest: personalBest
        ? {
            id: personalBest.id,
            durationMs: personalBest.duration_ms,
            feeUsd:
              personalBest.fee_usd != null ? Number(personalBest.fee_usd) : null,
          }
        : null,
    });
  } catch (err) {
    console.error('[api/ghost-race] GET error', err);
    return NextResponse.json({ error: 'Could not load leaderboard.' }, { status: 500 });
  }
}

// POST /api/ghost-race — verify memo tx + persist run
export async function POST(request: Request) {
  let body: {
    telegramId?: string;
    walletAddress?: string;
    signature?: string;
    raceNonce?: string;
    durationMs?: number;
    slot?: number | null;
    cluster?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const result = await persistGhostRaceRun({
    walletAddress: body.walletAddress || '',
    signature: body.signature || '',
    raceNonce: body.raceNonce || '',
    durationMs: Number(body.durationMs),
    telegramId: body.telegramId,
    cluster: body.cluster,
    clientSlot: body.slot,
    requestOrigin: new URL(request.url).origin,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    runId: result.runId,
    resultUrl: result.resultUrl,
    durationMs: result.durationMs,
    feeUsd: result.feeUsd,
    feeLamports: result.feeLamports,
    slot: result.slot,
    explorerUrl: result.explorerUrl,
    cluster: result.cluster,
    rank: result.rank,
    total: result.total,
    alreadySaved: result.alreadySaved,
  });
}
