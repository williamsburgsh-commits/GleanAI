import { getServiceClient } from './supabaseServer';

type Supa = ReturnType<typeof getServiceClient>;

export type RewardStatus = 'pending' | 'paid' | 'cancelled';

export interface RewardWithUser {
  id: string;
  amount_sol: string;
  reason: string;
  status: RewardStatus;
  payout_tx_signature: string | null;
  paid_at: string | null;
  created_at: string;
  user: {
    id: string;
    telegram_id: number;
    telegram_username: string | null;
    wallet_address: string | null;
  } | null;
}

export async function listRewards(
  supabase: Supa,
  status?: RewardStatus
): Promise<RewardWithUser[]> {
  let query = supabase
    .from('rewards')
    .select(
      'id, amount_sol, reason, status, payout_tx_signature, paid_at, created_at, ' +
        'user:users ( id, telegram_id, telegram_username, wallet_address )'
    )
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as RewardWithUser[];
}

export async function createReward(
  supabase: Supa,
  params: { userId: string; amountSol: number; reason: string }
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('rewards')
    .insert({
      user_id: params.userId,
      amount_sol: params.amountSol,
      reason: params.reason,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function updateRewardStatus(
  supabase: Supa,
  id: string,
  status: RewardStatus,
  payoutTxSignature?: string | null
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'paid') {
    patch.paid_at = new Date().toISOString();
    patch.payout_tx_signature = payoutTxSignature ?? null;
  }
  if (status === 'pending' || status === 'cancelled') {
    patch.paid_at = null;
    if (status === 'cancelled') patch.payout_tx_signature = null;
  }

  const { error } = await supabase.from('rewards').update(patch).eq('id', id);
  if (error) throw error;
}

export interface RewardSummary {
  pendingCount: number;
  pendingSol: number;
  paidSol: number;
}

export async function getRewardSummary(supabase: Supa): Promise<RewardSummary> {
  const { data, error } = await supabase
    .from('rewards')
    .select('amount_sol, status');
  if (error) throw error;

  let pendingCount = 0;
  let pendingSol = 0;
  let paidSol = 0;
  for (const row of data ?? []) {
    const amt = Number(row.amount_sol);
    if (row.status === 'pending') {
      pendingCount += 1;
      pendingSol += amt;
    } else if (row.status === 'paid') {
      paidSol += amt;
    }
  }
  return { pendingCount, pendingSol, paidSol };
}
