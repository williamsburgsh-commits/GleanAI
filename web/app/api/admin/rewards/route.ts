import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  listRewards,
  createReward,
  getRewardSummary,
  type RewardStatus,
} from '@/lib/rewards.server';

export const runtime = 'nodejs';

const STATUSES: RewardStatus[] = ['pending', 'paid', 'cancelled'];

// GET /api/admin/rewards?status=pending
export async function GET(request: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status') as RewardStatus | null;
  const status =
    statusParam && STATUSES.includes(statusParam) ? statusParam : undefined;

  try {
    const supabase = getServiceClient();
    const [rewards, summary] = await Promise.all([
      listRewards(supabase, status),
      getRewardSummary(supabase),
    ]);
    return NextResponse.json({ rewards, summary });
  } catch (err) {
    console.error('[api/admin/rewards] list error', err);
    return NextResponse.json({ error: 'Could not load rewards.' }, { status: 500 });
  }
}

// POST /api/admin/rewards { userId, amountSol, reason }
export async function POST(request: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { userId?: string; amountSol?: number; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const userId = (body.userId || '').toString().trim();
  const amountSol = Number(body.amountSol);
  const reason = (body.reason || '').toString().trim();

  if (!userId) {
    return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
  }
  if (!Number.isFinite(amountSol) || amountSol <= 0) {
    return NextResponse.json(
      { error: 'amountSol must be a positive number.' },
      { status: 400 }
    );
  }
  if (!reason) {
    return NextResponse.json({ error: 'reason is required.' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    const created = await createReward(supabase, { userId, amountSol, reason });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    console.error('[api/admin/rewards] create error', err);
    return NextResponse.json({ error: 'Could not create reward.' }, { status: 500 });
  }
}
