import { getServiceClient } from '@/lib/supabaseServer';

type Supa = ReturnType<typeof getServiceClient>;

export async function awardPoints(
  supabase: Supa,
  params: {
    userId: string;
    amount: number;
    reason: string;
    refId?: string | null;
  }
): Promise<{ pointsBefore: number; pointsAfter: number } | null> {
  const { userId, amount, reason, refId = null } = params;
  if (amount <= 0) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('points')
    .eq('id', userId)
    .single();
  if (error) throw error;

  const pointsBefore = user.points as number;
  const pointsAfter = pointsBefore + amount;

  const { error: updateErr } = await supabase
    .from('users')
    .update({ points: pointsAfter })
    .eq('id', userId);
  if (updateErr) throw updateErr;

  const { error: ledgerErr } = await supabase.from('points_ledger').insert({
    user_id: userId,
    amount,
    reason,
    ref_id: refId,
  });
  if (ledgerErr) throw ledgerErr;

  return { pointsBefore, pointsAfter };
}

export async function sumLedgerByPrefix(
  supabase: Supa,
  userId: string,
  reasonPrefix: string,
  since?: string
): Promise<number> {
  let q = supabase
    .from('points_ledger')
    .select('amount')
    .eq('user_id', userId)
    .like('reason', `${reasonPrefix}%`);
  if (since) q = q.gte('created_at', since);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
}
