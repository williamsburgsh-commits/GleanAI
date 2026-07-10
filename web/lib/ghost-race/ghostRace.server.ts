import { getServiceClient } from '@/lib/supabaseServer';

type Supa = ReturnType<typeof getServiceClient>;

export interface GhostRaceRunRow {
  id: string;
  user_id: string | null;
  wallet_address: string;
  signature: string;
  race_nonce: string;
  duration_ms: number;
  slot: number | null;
  fee_lamports: number | null;
  fee_usd: number | null;
  cluster: string;
  explorer_url: string;
  result_card_url: string | null;
  created_at: string;
}

export async function createGhostRaceRun(
  supabase: Supa,
  params: {
    userId: string | null;
    walletAddress: string;
    signature: string;
    raceNonce: string;
    durationMs: number;
    slot: number | null;
    feeLamports: number | null;
    feeUsd: number | null;
    cluster: string;
    explorerUrl: string;
  }
): Promise<GhostRaceRunRow> {
  const { data, error } = await supabase
    .from('ghost_race_runs')
    .insert({
      user_id: params.userId,
      wallet_address: params.walletAddress,
      signature: params.signature,
      race_nonce: params.raceNonce,
      duration_ms: params.durationMs,
      slot: params.slot,
      fee_lamports: params.feeLamports,
      fee_usd: params.feeUsd,
      cluster: params.cluster,
      explorer_url: params.explorerUrl,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as GhostRaceRunRow;
}

export async function setGhostRaceResultUrl(
  supabase: Supa,
  id: string,
  url: string
): Promise<void> {
  const { error } = await supabase
    .from('ghost_race_runs')
    .update({ result_card_url: url })
    .eq('id', id);
  if (error) throw error;
}

export async function getGhostRaceRun(
  supabase: Supa,
  id: string
): Promise<GhostRaceRunRow | null> {
  const { data, error } = await supabase
    .from('ghost_race_runs')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as GhostRaceRunRow | null;
}

export async function getGhostRaceBySignature(
  supabase: Supa,
  signature: string
): Promise<GhostRaceRunRow | null> {
  const { data, error } = await supabase
    .from('ghost_race_runs')
    .select('*')
    .eq('signature', signature)
    .maybeSingle();
  if (error) throw error;
  return data as GhostRaceRunRow | null;
}

export async function getGhostRaceRank(
  supabase: Supa,
  durationMs: number
): Promise<{ rank: number; total: number }> {
  const { count: faster, error: e1 } = await supabase
    .from('ghost_race_runs')
    .select('id', { count: 'exact', head: true })
    .lt('duration_ms', durationMs);
  if (e1) throw e1;

  const { count: total, error: e2 } = await supabase
    .from('ghost_race_runs')
    .select('id', { count: 'exact', head: true });
  if (e2) throw e2;

  return { rank: (faster ?? 0) + 1, total: total ?? 0 };
}

export async function getPersonalBest(
  supabase: Supa,
  walletAddress: string
): Promise<GhostRaceRunRow | null> {
  const { data, error } = await supabase
    .from('ghost_race_runs')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('duration_ms', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as GhostRaceRunRow | null;
}

export async function getLeaderboard(
  supabase: Supa,
  limit = 5
): Promise<GhostRaceRunRow[]> {
  const { data, error } = await supabase
    .from('ghost_race_runs')
    .select('*')
    .order('duration_ms', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as GhostRaceRunRow[];
}
