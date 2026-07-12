import { getServiceClient } from '@/lib/supabaseServer';
import { getOrCreateCurrentEpoch } from '@/lib/points/epochs.server';
import {
  LEADERBOARD_MIN_POINTS,
  LEADERBOARD_TOP_N,
} from '@/lib/points/rules';

type Supa = ReturnType<typeof getServiceClient>;

export interface LeaderboardEntry {
  rank: number;
  telegramId: string;
  username: string | null;
  points: number;
}

function qualifies(walletAddress: string | null | undefined, points: number): boolean {
  return Boolean(walletAddress) && points >= LEADERBOARD_MIN_POINTS;
}

export async function getAllTimeLeaderboard(
  supabase: Supa,
  limit = LEADERBOARD_TOP_N
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('users')
    .select('telegram_id, telegram_username, points, wallet_address')
    .not('wallet_address', 'is', null)
    .gte('points', LEADERBOARD_MIN_POINTS)
    .order('points', { ascending: false })
    .order('updated_at', { ascending: true })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((u, i) => ({
    rank: i + 1,
    telegramId: String(u.telegram_id),
    username: (u.telegram_username as string | null) ?? null,
    points: u.points as number,
  }));
}

export async function getEpochLeaderboard(
  supabase: Supa,
  limit = LEADERBOARD_TOP_N
): Promise<{ epoch: Awaited<ReturnType<typeof getOrCreateCurrentEpoch>>; top: LeaderboardEntry[] }> {
  const epoch = await getOrCreateCurrentEpoch(supabase);

  const { data: ledger, error: ledgerErr } = await supabase
    .from('points_ledger')
    .select('user_id, amount')
    .gte('created_at', epoch.starts_at)
    .lt('created_at', epoch.ends_at);
  if (ledgerErr) throw ledgerErr;

  const totals = new Map<string, number>();
  for (const row of ledger ?? []) {
    const id = row.user_id as string;
    totals.set(id, (totals.get(id) ?? 0) + (row.amount as number));
  }

  const ranked = [...totals.entries()]
    .filter(([, pts]) => pts >= LEADERBOARD_MIN_POINTS)
    .sort((a, b) => b[1] - a[1]);

  const topSlice = ranked.slice(0, limit);
  const userIds = topSlice.map(([id]) => id);

  if (userIds.length === 0) {
    return { epoch, top: [] };
  }

  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, telegram_id, telegram_username, wallet_address')
    .in('id', userIds)
    .not('wallet_address', 'is', null);
  if (usersErr) throw usersErr;

  const userMap = new Map((users ?? []).map((u) => [u.id as string, u]));

  const top: LeaderboardEntry[] = [];
  let rank = 0;
  for (const [userId, pts] of topSlice) {
    const u = userMap.get(userId);
    if (!u || !qualifies(u.wallet_address as string, pts)) continue;
    rank += 1;
    top.push({
      rank,
      telegramId: String(u.telegram_id),
      username: (u.telegram_username as string | null) ?? null,
      points: pts,
    });
  }

  return { epoch, top };
}

export async function getAllTimeRank(
  supabase: Supa,
  telegramId: string
): Promise<{ myRank: number | null; myPoints: number }> {
  const { data: me, error } = await supabase
    .from('users')
    .select('points, wallet_address')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (error) throw error;
  if (!me || !qualifies(me.wallet_address as string, me.points as number)) {
    return { myRank: null, myPoints: me?.points as number ?? 0 };
  }

  const myPoints = me.points as number;
  const { count: above, error: aboveErr } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .not('wallet_address', 'is', null)
    .gte('points', LEADERBOARD_MIN_POINTS)
    .gt('points', myPoints);
  if (aboveErr) throw aboveErr;

  return { myRank: (above ?? 0) + 1, myPoints };
}

export async function getEpochRank(
  supabase: Supa,
  telegramId: string
): Promise<{ myRank: number | null; myPoints: number; epoch: Awaited<ReturnType<typeof getOrCreateCurrentEpoch>> }> {
  const epoch = await getOrCreateCurrentEpoch(supabase);

  const { data: me, error } = await supabase
    .from('users')
    .select('id, points, wallet_address')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (error) throw error;
  if (!me?.wallet_address) {
    return { myRank: null, myPoints: 0, epoch };
  }

  const { data: myLedger, error: ledErr } = await supabase
    .from('points_ledger')
    .select('amount')
    .eq('user_id', me.id)
    .gte('created_at', epoch.starts_at)
    .lt('created_at', epoch.ends_at);
  if (ledErr) throw ledErr;

  const myPoints = (myLedger ?? []).reduce((s, r) => s + (r.amount as number), 0);
  if (!qualifies(me.wallet_address as string, myPoints)) {
    return { myRank: null, myPoints, epoch };
  }

  const { data: ledger, error: allErr } = await supabase
    .from('points_ledger')
    .select('user_id, amount')
    .gte('created_at', epoch.starts_at)
    .lt('created_at', epoch.ends_at);
  if (allErr) throw allErr;

  const totals = new Map<string, number>();
  for (const row of ledger ?? []) {
    const id = row.user_id as string;
    totals.set(id, (totals.get(id) ?? 0) + (row.amount as number));
  }

  const qualifyingAbove = await countQualifyingAbove(supabase, totals, myPoints);
  return { myRank: qualifyingAbove + 1, myPoints, epoch };
}

async function countQualifyingAbove(
  supabase: Supa,
  totals: Map<string, number>,
  myPoints: number
): Promise<number> {
  const candidates = [...totals.entries()].filter(
    ([, pts]) => pts >= LEADERBOARD_MIN_POINTS && pts > myPoints
  );
  if (candidates.length === 0) return 0;

  const ids = candidates.map(([id]) => id);
  const { data: users, error } = await supabase
    .from('users')
    .select('id')
    .in('id', ids)
    .not('wallet_address', 'is', null);
  if (error) throw error;
  return (users ?? []).length;
}

export async function getPointsBreakdown(
  supabase: Supa,
  userId: string,
  epochStartsAt: string,
  epochEndsAt: string
): Promise<{
  lifetime: number;
  epochTotal: number;
  epochQuests: number;
  epochBattles: number;
  epochReferrals: number;
  epochOther: number;
}> {
  const { data: user, error: uErr } = await supabase
    .from('users')
    .select('points')
    .eq('id', userId)
    .single();
  if (uErr) throw uErr;

  const { data: epochRows, error: eErr } = await supabase
    .from('points_ledger')
    .select('amount, reason')
    .eq('user_id', userId)
    .gte('created_at', epochStartsAt)
    .lt('created_at', epochEndsAt);
  if (eErr) throw eErr;

  let epochQuests = 0;
  let epochBattles = 0;
  let epochReferrals = 0;
  let epochOther = 0;

  for (const row of epochRows ?? []) {
    const amount = row.amount as number;
    const reason = row.reason as string;
    if (reason.startsWith('quest:')) epochQuests += amount;
    else if (reason.startsWith('battle:')) epochBattles += amount;
    else if (reason.startsWith('referral:')) epochReferrals += amount;
    else epochOther += amount;
  }

  const epochTotal = epochQuests + epochBattles + epochReferrals + epochOther;

  return {
    lifetime: user.points as number,
    epochTotal,
    epochQuests,
    epochBattles,
    epochReferrals,
    epochOther,
  };
}
