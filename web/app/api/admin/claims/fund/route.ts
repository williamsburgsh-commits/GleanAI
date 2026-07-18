import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { markClaimEpochFunded } from '@/lib/claims/publish.server';

export const runtime = 'nodejs';

// POST /api/admin/claims/fund { claimEpochId, onchainTx }
export async function POST(request: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { claimEpochId?: string; onchainTx?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const claimEpochId = (body.claimEpochId || '').toString().trim();
  const onchainTx = (body.onchainTx || '').toString().trim();
  if (!claimEpochId) {
    return NextResponse.json({ error: 'claimEpochId is required.' }, { status: 400 });
  }
  if (!onchainTx || onchainTx.length < 32) {
    return NextResponse.json({ error: 'onchainTx signature is required.' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    const epoch = await markClaimEpochFunded(supabase, { claimEpochId, onchainTx });
    return NextResponse.json({ ok: true, epoch });
  } catch (err) {
    console.error('[api/admin/claims/fund] error', err);
    const message = err instanceof Error ? err.message : 'Could not mark funded.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
