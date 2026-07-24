import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  listClaimEpochs,
  markClaimEpochFunded,
} from '@/lib/claims/publish.server';
import { setClaimRootOnchain } from '@/lib/claims/setRoot.server';

export const runtime = 'nodejs';

// POST /api/admin/claims/set-root { claimEpochId }
export async function POST(request: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { claimEpochId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const claimEpochId = (body.claimEpochId || '').toString().trim();
  if (!claimEpochId) {
    return NextResponse.json({ error: 'claimEpochId is required.' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    const epochs = await listClaimEpochs(supabase);
    const epoch = epochs.find((e) => e.id === claimEpochId);
    if (!epoch) {
      return NextResponse.json({ error: 'Claim epoch not found.' }, { status: 404 });
    }
    if (epoch.status === 'funded') {
      return NextResponse.json({
        ok: true,
        alreadyFunded: true,
        epoch,
      });
    }
    if (epoch.status !== 'published') {
      return NextResponse.json(
        { error: 'Only published epochs can be set on-chain.' },
        { status: 400 }
      );
    }

    const sig = await setClaimRootOnchain(epoch);
    const funded = await markClaimEpochFunded(supabase, {
      claimEpochId: epoch.id,
      onchainTx: sig,
    });

    return NextResponse.json({ ok: true, signature: sig, epoch: funded });
  } catch (err) {
    console.error('[api/admin/claims/set-root] error', err);
    const message = err instanceof Error ? err.message : 'Could not set root on-chain.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
