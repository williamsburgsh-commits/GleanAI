import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/solana/connection';
import { normalizeCluster } from '@/lib/solana/cluster';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Broadcast a fully-signed transaction via Alchemy.
 * Used for multi-signer mints so Phantom only signs (no public-RPC send).
 */
export async function POST(request: Request) {
  let body: { transaction?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const encoded = body.transaction?.trim();
  if (!encoded) {
    return NextResponse.json({ error: 'transaction (base64) is required.' }, { status: 400 });
  }

  let raw: Buffer;
  try {
    raw = Buffer.from(encoded, 'base64');
    if (raw.length < 64 || raw.length > 1232) {
      return NextResponse.json({ error: 'Invalid transaction size.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid base64 transaction.' }, { status: 400 });
  }

  try {
    const cluster = normalizeCluster(process.env.SOLANA_CLUSTER);
    const conn = getConnection({ cluster });
    const signature = await conn.sendRawTransaction(raw, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    });
    return NextResponse.json({ signature, cluster });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not broadcast transaction.';
    console.error('[api/solana/send]', err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
