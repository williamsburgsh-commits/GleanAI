import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { updateRewardStatus, type RewardStatus } from '@/lib/rewards.server';

export const runtime = 'nodejs';

const STATUSES: RewardStatus[] = ['pending', 'paid', 'cancelled'];

// PATCH /api/admin/rewards/[id]  { status, payoutTxSignature? }
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { status?: string; payoutTxSignature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const status = (body.status || '') as RewardStatus;
  if (!STATUSES.includes(status)) {
    return NextResponse.json(
      { error: 'status must be pending, paid, or cancelled.' },
      { status: 400 }
    );
  }

  const payoutTxSignature = (body.payoutTxSignature || '').toString().trim() || null;
  if (status === 'paid' && !payoutTxSignature) {
    return NextResponse.json(
      { error: 'A payout transaction signature is required to mark as paid.' },
      { status: 400 }
    );
  }

  try {
    const supabase = getServiceClient();
    await updateRewardStatus(supabase, params.id, status, payoutTxSignature);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/admin/rewards/:id] update error', err);
    return NextResponse.json({ error: 'Could not update reward.' }, { status: 500 });
  }
}
