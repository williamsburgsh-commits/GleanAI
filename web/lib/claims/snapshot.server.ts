import 'server-only';

import { getServiceClient } from '@/lib/supabaseServer';
import type { EpochRow } from '@/lib/points/epochs.server';

type Supa = ReturnType<typeof getServiceClient>;

export interface SnapshotEntry {
  userId: string;
  walletAddress: string;
  points: number;
}

/** Aggregate epoch ledger totals for users with a linked wallet and points > 0. */
export async function snapshotEpochClaims(
  supabase: Supa,
  epoch: EpochRow
): Promise<SnapshotEntry[]> {
  const { data: ledger, error: ledgerErr } = await supabase
    .from('points_ledger')
    .select('user_id, amount')
    .gte('created_at', epoch.starts_at)
    .lt('created_at', epoch.ends_at);
  if (ledgerErr) throw ledgerErr;

  const totals = new Map<string, number>();
  for (const row of ledger ?? []) {
    const id = row.user_id as string;
    totals.set(id, (totals.get(id) ?? 0) + Number(row.amount));
  }

  const positive = [...totals.entries()].filter(([, pts]) => pts > 0);
  if (positive.length === 0) return [];

  const userIds = positive.map(([id]) => id);
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, wallet_address')
    .in('id', userIds)
    .not('wallet_address', 'is', null);
  if (usersErr) throw usersErr;

  const walletById = new Map(
    (users ?? [])
      .filter((u) => u.wallet_address)
      .map((u) => [u.id as string, String(u.wallet_address).trim()])
  );

  const entries: SnapshotEntry[] = [];
  for (const [userId, points] of positive) {
    const wallet = walletById.get(userId);
    if (!wallet) continue;
    entries.push({ userId, walletAddress: wallet, points: Math.floor(points) });
  }

  // Deterministic order: wallet ascending (base58 string sort is fine for uniqueness)
  entries.sort((a, b) => a.walletAddress.localeCompare(b.walletAddress));
  return entries;
}
