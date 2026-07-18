import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/solana/connection';
import { normalizeCluster } from '@/lib/solana/cluster';
import { confirmSignature } from '@/lib/solana/confirmSignature';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Confirm a tx via Alchemy (not the public browser RPC). */
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

  const cluster = normalizeCluster(process.env.SOLANA_CLUSTER);
  const conn = getConnection({ cluster });

  try {
    await confirmSignature(conn, signature, { timeoutMs: 45_000, pollMs: 500 });
    return NextResponse.json({ ok: true, cluster });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not confirm transaction.';
    if (msg.includes('failed on-chain')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Last look at signature status before soft-failing.
    try {
      const { value } = await conn.getSignatureStatuses([signature], {
        searchTransactionHistory: true,
      });
      const status = value[0];
      if (status?.err) {
        return NextResponse.json(
          { error: 'Transaction failed on-chain.', details: status.err },
          { status: 400 }
        );
      }
      if (
        status?.confirmationStatus === 'confirmed' ||
        status?.confirmationStatus === 'finalized'
      ) {
        return NextResponse.json({ ok: true, cluster });
      }
    } catch {
      // ignore and soft-fail below
    }

    console.error('[api/claims/confirm]', err);
    return NextResponse.json(
      {
        ok: false,
        pending: true,
        error: msg,
      },
      { status: 202 }
    );
  }
}
