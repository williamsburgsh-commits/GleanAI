import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/solana/connection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Server-side blockhash — browser public RPCs often return 403. */
export async function GET() {
  try {
    const conn = getConnection();
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash(
      'confirmed'
    );
    return NextResponse.json({ blockhash, lastValidBlockHeight });
  } catch (err) {
    console.error('[api/solana/blockhash]', err);
    return NextResponse.json(
      { error: 'Could not fetch blockhash.' },
      { status: 500 }
    );
  }
}
