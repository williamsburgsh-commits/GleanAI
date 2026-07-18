import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import { markLeafClaimed } from '@/lib/claims/publish.server';

export const runtime = 'nodejs';

// POST /api/claims/mark-claimed { telegramId, claimEpochId, claimTx }
export async function POST(request: Request) {
  let body: { telegramId?: string; claimEpochId?: string; claimTx?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  const claimEpochId = (body.claimEpochId || '').toString().trim();
  const claimTx = (body.claimTx || '').toString().trim();

  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ error: 'A valid telegramId is required.' }, { status: 400 });
  }
  if (!claimEpochId) {
    return NextResponse.json({ error: 'claimEpochId is required.' }, { status: 400 });
  }
  if (!claimTx || claimTx.length < 32) {
    return NextResponse.json({ error: 'claimTx is required.' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    await markLeafClaimed(supabase, { telegramId, claimEpochId, claimTx });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/claims/mark-claimed] error', err);
    const message = err instanceof Error ? err.message : 'Could not mark claim.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
