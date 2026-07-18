import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/solana/connection';
import { normalizeCluster } from '@/lib/solana/cluster';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Server-side blockhash — browser public RPCs often return 403. */
export async function GET() {
  try {
    const cluster = normalizeCluster(process.env.SOLANA_CLUSTER);
    const conn = getConnection({ cluster });
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash(
      'confirmed'
    );
    return NextResponse.json({ blockhash, lastValidBlockHeight, cluster });
  } catch (err) {
    console.error('[api/solana/blockhash]', err);
    return NextResponse.json(
      { error: 'Could not fetch blockhash.' },
      { status: 500 }
    );
  }
}
