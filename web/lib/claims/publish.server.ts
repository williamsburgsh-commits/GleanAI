import 'server-only';

import { PublicKey } from '@solana/web3.js';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  currentEpochBounds,
  getOrCreateCurrentEpoch,
  type EpochRow,
} from '@/lib/points/epochs.server';
import { buildClaimMerkle } from '@/lib/claims/merkle';
import { snapshotEpochClaims } from '@/lib/claims/snapshot.server';
import { verifyClaimTransaction } from '@/lib/claims/verifyClaimTx.server';
import { getConnection } from '@/lib/solana/connection';
import { normalizeCluster } from '@/lib/solana/cluster';
import { getFighterByUserId } from '@/lib/wallet-wars/fighter.server';
import { reconcileStakeWithChain } from '@/lib/staking/staking.server';

type Supa = ReturnType<typeof getServiceClient>;

export type ClaimEpochStatus = 'draft' | 'published' | 'funded';

export interface ClaimEpochRow {
  id: string;
  epoch_id: string;
  slug: string;
  merkle_root: string;
  mint: string;
  points_to_units: number;
  total_points: number;
  total_claim_units: string;
  leaf_count: number;
  status: ClaimEpochStatus;
  onchain_tx: string | null;
  published_at: string | null;
  created_at: string;
}

export function getClaimConfig() {
  const mint =
    process.env.CLAIM_MINT?.trim() ||
    process.env.NEXT_PUBLIC_CLAIM_MINT?.trim() ||
    '';
  const programId =
    process.env.CLAIM_PROGRAM_ID?.trim() ||
    process.env.NEXT_PUBLIC_CLAIM_PROGRAM_ID?.trim() ||
    '';
  const pointsToUnits = Math.max(
    1,
    Number(process.env.CLAIM_POINTS_TO_UNITS?.trim() || '1000000') || 1_000_000
  );
  return { mint, programId, pointsToUnits, claimsReady: Boolean(mint && programId) };
}

/** Resolve the previous completed UTC week (not the in-progress epoch). */
export async function getPreviousCompletedEpoch(supabase: Supa): Promise<EpochRow> {
  const current = currentEpochBounds();
  const prevEnd = new Date(current.startsAt);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - 7);

  const y = prevStart.getUTCFullYear();
  const jan1 = new Date(Date.UTC(y, 0, 1));
  const week = Math.ceil(
    ((prevStart.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7
  );
  const slug = `${y}-W${String(week).padStart(2, '0')}`;

  const { data: existing, error } = await supabase
    .from('epochs')
    .select('id, slug, starts_at, ends_at')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing as EpochRow;

  const { data: created, error: insertErr } = await supabase
    .from('epochs')
    .insert({
      slug,
      starts_at: prevStart.toISOString(),
      ends_at: prevEnd.toISOString(),
    })
    .select('id, slug, starts_at, ends_at')
    .single();
  if (insertErr) throw insertErr;
  return created as EpochRow;
}

export async function getEpochBySlug(supabase: Supa, slug: string): Promise<EpochRow | null> {
  const { data, error } = await supabase
    .from('epochs')
    .select('id, slug, starts_at, ends_at')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as EpochRow | null) ?? null;
}

export async function listClaimEpochs(supabase: Supa): Promise<ClaimEpochRow[]> {
  const { data, error } = await supabase
    .from('claim_epochs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClaimEpochRow[];
}

/** Latest epoch users can actually claim against (set_root completed). */
export async function getLatestFundedClaimEpoch(
  supabase: Supa
): Promise<ClaimEpochRow | null> {
  const { data, error } = await supabase
    .from('claim_epochs')
    .select('*')
    .eq('status', 'funded')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ClaimEpochRow | null) ?? null;
}

/** Most recent published epoch that is not yet funded (for admin / pending UI). */
export async function getLatestPendingClaimEpoch(
  supabase: Supa
): Promise<ClaimEpochRow | null> {
  const { data, error } = await supabase
    .from('claim_epochs')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ClaimEpochRow | null) ?? null;
}

function isBadgeStaked(
  fighter: { badge_staked_at?: string | null; badge_unstaked_at?: string | null } | null
): boolean {
  return Boolean(
    fighter?.badge_staked_at &&
      (!fighter.badge_unstaked_at ||
        new Date(fighter.badge_staked_at).getTime() >
          new Date(fighter.badge_unstaked_at).getTime())
  );
}

export async function publishClaimEpoch(
  supabase: Supa,
  opts: { epochSlug?: string | null } = {}
): Promise<ClaimEpochRow> {
  const { mint, pointsToUnits } = getClaimConfig();
  if (!mint) {
    throw new Error('CLAIM_MINT (or NEXT_PUBLIC_CLAIM_MINT) is required to publish.');
  }

  // Ensure current epoch row exists (side effect for continuity).
  await getOrCreateCurrentEpoch(supabase);

  const epoch = opts.epochSlug
    ? await getEpochBySlug(supabase, opts.epochSlug)
    : await getPreviousCompletedEpoch(supabase);
  if (!epoch) throw new Error(`Epoch not found: ${opts.epochSlug}`);

  const { data: existing } = await supabase
    .from('claim_epochs')
    .select('*')
    .eq('slug', epoch.slug)
    .maybeSingle();
  if (existing) return existing as ClaimEpochRow;

  const snapshot = await snapshotEpochClaims(supabase, epoch);
  if (snapshot.length === 0) {
    throw new Error(`No claimable wallets for epoch ${epoch.slug}.`);
  }

  const entries = snapshot.map((s, index) => ({
    index,
    walletAddress: s.walletAddress,
    amount: BigInt(s.points) * BigInt(pointsToUnits),
    userId: s.userId,
    points: s.points,
  }));

  const { root, proofs } = buildClaimMerkle(
    entries.map((e) => ({
      index: e.index,
      walletAddress: e.walletAddress,
      amount: e.amount,
    }))
  );

  const totalPoints = entries.reduce((sum, e) => sum + e.points, 0);
  const totalUnits = entries.reduce((sum, e) => sum + e.amount, 0n);

  const { data: claimEpoch, error: insertErr } = await supabase
    .from('claim_epochs')
    .insert({
      epoch_id: epoch.id,
      slug: epoch.slug,
      merkle_root: root,
      mint,
      points_to_units: pointsToUnits,
      total_points: totalPoints,
      total_claim_units: totalUnits.toString(),
      leaf_count: entries.length,
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (insertErr) throw insertErr;

  const leafRows = entries.map((e, i) => ({
    claim_epoch_id: claimEpoch.id,
    user_id: e.userId,
    wallet_address: e.walletAddress,
    leaf_index: e.index,
    points: e.points,
    amount: e.amount.toString(),
    proof: proofs[i],
  }));

  const { error: leavesErr } = await supabase.from('claim_leaves').insert(leafRows);
  if (leavesErr) throw leavesErr;

  return claimEpoch as ClaimEpochRow;
}

export async function getClaimForTelegramUser(
  supabase: Supa,
  telegramId: string
): Promise<{
  epoch: ClaimEpochRow | null;
  pendingEpoch: ClaimEpochRow | null;
  leaf: {
    leafIndex: number;
    points: number;
    amount: string;
    walletAddress: string;
    proof: string[];
    claimedAt: string | null;
    claimTx: string | null;
  } | null;
  config: ReturnType<typeof getClaimConfig> & {
    badgeStaked: boolean;
    stakingRequired: boolean;
    epochFunded: boolean;
  };
} | null> {
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, wallet_address')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (userErr) throw userErr;
  if (!user) return null;

  let fighter = await getFighterByUserId(supabase, user.id);
  if (fighter?.badge_mint && user.wallet_address) {
    try {
      const cluster = normalizeCluster(process.env.SOLANA_CLUSTER);
      const conn = getConnection({ cluster });
      const reconciled = await reconcileStakeWithChain({
        supabase,
        fighter,
        connection: conn,
        owner: new PublicKey(user.wallet_address),
      });
      fighter = reconciled.fighter;
    } catch (err) {
      console.warn('[claims] reconcileStakeWithChain', err);
    }
  }

  const badgeStaked = isBadgeStaked(fighter);

  const [epoch, pendingEpoch] = await Promise.all([
    getLatestFundedClaimEpoch(supabase),
    getLatestPendingClaimEpoch(supabase),
  ]);

  const base = getClaimConfig();
  const epochMint = epoch?.mint?.trim() || '';
  const mint = epochMint || base.mint;
  const epochFunded = epoch?.status === 'funded';
  const config = {
    ...base,
    mint,
    badgeStaked,
    stakingRequired: true,
    epochFunded,
    // Brief: mint + stake NFTs to unlock claims; epoch must be funded on-chain.
    claimsReady: Boolean(base.programId && mint) && badgeStaked && epochFunded,
  };

  if (!epoch) return { epoch: null, pendingEpoch, leaf: null, config };

  const { data: leaf, error: leafErr } = await supabase
    .from('claim_leaves')
    .select('*')
    .eq('claim_epoch_id', epoch.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (leafErr) throw leafErr;

  return {
    epoch: epoch as ClaimEpochRow,
    pendingEpoch,
    leaf: leaf
      ? {
          leafIndex: leaf.leaf_index as number,
          points: leaf.points as number,
          amount: String(leaf.amount),
          walletAddress: leaf.wallet_address as string,
          proof: (leaf.proof as string[]) ?? [],
          claimedAt: (leaf.claimed_at as string | null) ?? null,
          claimTx: (leaf.claim_tx as string | null) ?? null,
        }
      : null,
    config,
  };
}

export async function markLeafClaimed(
  supabase: Supa,
  params: { telegramId: string; claimEpochId: string; claimTx: string }
): Promise<void> {
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, wallet_address')
    .eq('telegram_id', params.telegramId)
    .maybeSingle();
  if (userErr) throw userErr;
  if (!user) throw new Error('User not found.');

  const { data: epoch, error: epochErr } = await supabase
    .from('claim_epochs')
    .select('*')
    .eq('id', params.claimEpochId)
    .maybeSingle();
  if (epochErr) throw epochErr;
  if (!epoch) throw new Error('Claim epoch not found.');
  if (epoch.status !== 'funded') {
    throw new Error('Claim epoch is not funded on-chain yet.');
  }

  const { data: leaf, error: leafErr } = await supabase
    .from('claim_leaves')
    .select('*')
    .eq('claim_epoch_id', params.claimEpochId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (leafErr) throw leafErr;
  if (!leaf) throw new Error('No claim leaf for this user.');
  if (leaf.claimed_at) throw new Error('Already claimed.');

  let fighter = await getFighterByUserId(supabase, user.id);
  if (fighter?.badge_mint && user.wallet_address) {
    try {
      const cluster = normalizeCluster(process.env.SOLANA_CLUSTER);
      const conn = getConnection({ cluster });
      const reconciled = await reconcileStakeWithChain({
        supabase,
        fighter,
        connection: conn,
        owner: new PublicKey(user.wallet_address),
      });
      fighter = reconciled.fighter;
    } catch (err) {
      console.warn('[claims/markLeafClaimed] reconcileStakeWithChain', err);
    }
  }
  if (!isBadgeStaked(fighter)) {
    throw new Error('Fighter Badge must be staked to mark a claim.');
  }

  const programId =
    process.env.CLAIM_PROGRAM_ID?.trim() ||
    process.env.NEXT_PUBLIC_CLAIM_PROGRAM_ID?.trim() ||
    '';
  const mint = (epoch.mint as string)?.trim() || '';
  if (!programId || !mint) {
    throw new Error('Claim program or mint not configured.');
  }

  await verifyClaimTransaction({
    claimTx: params.claimTx,
    programId,
    mint,
    leafIndex: leaf.leaf_index as number,
  });

  const { error } = await supabase
    .from('claim_leaves')
    .update({
      claimed_at: new Date().toISOString(),
      claim_tx: params.claimTx,
    })
    .eq('claim_epoch_id', params.claimEpochId)
    .eq('user_id', user.id)
    .is('claimed_at', null);
  if (error) throw error;
}

export async function markClaimEpochFunded(
  supabase: Supa,
  params: { claimEpochId: string; onchainTx: string }
): Promise<ClaimEpochRow> {
  const { data, error } = await supabase
    .from('claim_epochs')
    .update({
      status: 'funded',
      onchain_tx: params.onchainTx,
    })
    .eq('id', params.claimEpochId)
    .select('*')
    .single();
  if (error) throw error;
  return data as ClaimEpochRow;
}
