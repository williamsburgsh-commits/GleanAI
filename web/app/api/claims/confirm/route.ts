import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/solana/connection';

export const runtime = 'nodejs';

/** Confirm a claim tx via Alchemy (not the public browser RPC). */
export async function POST(request: Request) {
  let body: {
    signature?: string;
    blockhash?: string;
    lastValidBlockHeight?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const signature = body.signature?.trim();
  const blockhash = body.blockhash?.trim();
  const lastValidBlockHeight = body.lastValidBlockHeight;
  if (!signature || !blockhash || typeof lastValidBlockHeight !== 'number') {
    return NextResponse.json(
      { error: 'signature, blockhash, and lastValidBlockHeight are required.' },
      { status: 400 }
    );
  }

  try {
    const conn = getConnection();
    const result = await conn.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    );
    if (result.value.err) {
      return NextResponse.json(
        { error: 'Transaction failed on-chain.', details: result.value.err },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/claims/confirm]', err);
    return NextResponse.json(
      { error: 'Could not confirm transaction.' },
      { status: 500 }
    );
  }
}
