import { PublicKey, type ParsedTransactionWithMeta } from '@solana/web3.js';
import { getServiceClient } from '@/lib/supabaseServer';
import { getOrCreateUserByTelegramId } from '@/lib/users.server';
import { getQuestBySlug, recordCompletion } from '@/lib/quests.server';
import { getConnection } from '@/lib/solana/connection';
import { normalizeCluster, clusterLabel } from '@/lib/solana/cluster';
import { fetchSolPriceUsd } from '@/lib/receipt/solPrice';
import { getPublicWebAppUrl } from '@/lib/publicWebAppUrl';
import {
  GHOST_RACE_MEMO_PREFIX,
  MEMO_PROGRAM_ID,
} from '@/lib/solana/memoTx';
import {
  createGhostRaceRun,
  getGhostRaceBySignature,
  getGhostRaceRank,
  setGhostRaceResultUrl,
  type GhostRaceRunRow,
} from '@/lib/ghost-race/ghostRace.server';

export const MIN_DURATION_MS = 50;
export const MAX_DURATION_MS = 60_000;

export type PersistGhostRaceResult =
  | {
      ok: true;
      runId: string;
      resultUrl: string;
      durationMs: number;
      feeUsd: number | null;
      feeLamports: number | null;
      slot: number | null;
      explorerUrl: string;
      cluster: string;
      rank: number | null;
      total: number;
      alreadySaved?: boolean;
    }
  | { ok: false; error: string; status: number };

function isValidSolanaAddress(address: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

function explorerUrl(signature: string, cluster: string): string {
  const base = `https://explorer.solana.com/tx/${signature}`;
  if (cluster === 'devnet' || cluster === 'testnet') {
    return `${base}?cluster=${cluster}`;
  }
  return base;
}

export function extractMemoText(tx: ParsedTransactionWithMeta): string | null {
  const memoId = MEMO_PROGRAM_ID.toBase58();
  const instructions = tx.transaction.message.instructions;
  for (const ix of instructions) {
    if ('parsed' in ix) {
      const programId =
        typeof ix.programId === 'string'
          ? ix.programId
          : ix.programId?.toBase58?.() ?? '';
      const isMemo = ix.program === 'spl-memo' || programId === memoId;
      if (!isMemo) continue;
      if (typeof ix.parsed === 'string') return ix.parsed;
      if (ix.parsed && typeof ix.parsed === 'object') {
        const info = (ix.parsed as { info?: unknown }).info;
        if (typeof info === 'string') return info;
      }
    } else if (
      ix.programId &&
      typeof ix.programId.toBase58 === 'function' &&
      ix.programId.toBase58() === memoId
    ) {
      continue;
    }
  }
  return null;
}

function feePayerMatches(
  tx: ParsedTransactionWithMeta,
  wallet: string
): boolean {
  const keys = tx.transaction.message.accountKeys;
  const payer = keys[0];
  if (!payer) return false;
  if (typeof payer === 'string') return payer === wallet;
  if ('pubkey' in payer) {
    const pk = payer.pubkey;
    const addr = typeof pk === 'string' ? pk : pk.toBase58();
    return addr === wallet;
  }
  return false;
}

async function resolveUserId(
  supabase: ReturnType<typeof getServiceClient>,
  walletAddress: string,
  telegramId?: string
): Promise<string | null> {
  if (telegramId && /^\d+$/.test(telegramId)) {
    const user = await getOrCreateUserByTelegramId(supabase, telegramId);
    return user.id;
  }

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', walletAddress)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function creditGhostRaceQuest(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string
): Promise<void> {
  const quest = await getQuestBySlug(supabase, 'complete-ghost-race');
  if (!quest) return;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, telegram_id, wallet_address, points')
    .eq('id', userId)
    .single();
  if (error || !user) return;

  try {
    await recordCompletion(supabase, { user, quest });
  } catch (err) {
    console.error('[ghost-race] quest credit failed', err);
  }
}

function resultPayload(
  run: GhostRaceRunRow,
  origin: string,
  extras?: {
    feeUsd?: number | null;
    feeLamports?: number | null;
    alreadySaved?: boolean;
    rank?: number | null;
    total?: number;
  }
): Extract<PersistGhostRaceResult, { ok: true }> {
  const resultUrl =
    run.result_card_url || `${origin}/ghost-race/result/${run.id}`;
  return {
    ok: true,
    runId: run.id,
    resultUrl,
    durationMs: run.duration_ms,
    feeUsd:
      extras?.feeUsd !== undefined
        ? extras.feeUsd
        : run.fee_usd != null
          ? Number(run.fee_usd)
          : null,
    feeLamports: extras?.feeLamports ?? run.fee_lamports,
    slot: run.slot,
    explorerUrl: run.explorer_url,
    cluster: clusterLabel(normalizeCluster(run.cluster)),
    rank: extras?.rank ?? null,
    total: extras?.total ?? 0,
    alreadySaved: extras?.alreadySaved,
  };
}

/**
 * Verify a Ghost Race memo tx and persist the run.
 * Shared by Mini App POST /api/ghost-race and Blink chain callback.
 */
export async function persistGhostRaceRun(params: {
  walletAddress: string;
  signature: string;
  raceNonce: string;
  durationMs: number;
  telegramId?: string;
  cluster?: string;
  clientSlot?: number | null;
  /** Fallback origin when public URL env is unset */
  requestOrigin?: string;
}): Promise<PersistGhostRaceResult> {
  const walletAddress = params.walletAddress.trim();
  const signature = params.signature.trim();
  const raceNonce = params.raceNonce.trim();
  const durationMs = Number(params.durationMs);
  const telegramId = params.telegramId?.toString().trim() || undefined;
  const clientSlot =
    params.clientSlot != null && Number.isFinite(Number(params.clientSlot))
      ? Number(params.clientSlot)
      : null;

  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return { ok: false, error: 'Valid walletAddress required.', status: 400 };
  }
  if (!signature) {
    return { ok: false, error: 'signature required.', status: 400 };
  }
  if (!raceNonce || raceNonce.length < 8 || raceNonce.length > 80) {
    return { ok: false, error: 'raceNonce invalid.', status: 400 };
  }
  if (
    !Number.isFinite(durationMs) ||
    durationMs < MIN_DURATION_MS ||
    durationMs > MAX_DURATION_MS
  ) {
    return {
      ok: false,
      error: `durationMs must be between ${MIN_DURATION_MS} and ${MAX_DURATION_MS}.`,
      status: 400,
    };
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch {
    return { ok: false, error: 'Server is misconfigured.', status: 500 };
  }

  const origin =
    getPublicWebAppUrl() || params.requestOrigin || 'https://glean-ai-web.vercel.app';

  try {
    const existing = await getGhostRaceBySignature(supabase, signature);
    if (existing) {
      return resultPayload(existing, origin, { alreadySaved: true });
    }

    const cluster = normalizeCluster(params.cluster);
    const conn = getConnection({ cluster });
    const tx = await conn.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!tx || tx.meta?.err) {
      return {
        ok: false,
        error: 'Transaction not found or failed. Wait a moment and retry.',
        status: 400,
      };
    }

    if (!feePayerMatches(tx, walletAddress)) {
      return {
        ok: false,
        error: 'Transaction fee payer does not match wallet.',
        status: 400,
      };
    }

    const memo = extractMemoText(tx);
    const expected = `${GHOST_RACE_MEMO_PREFIX}${raceNonce}`;
    if (!memo || memo !== expected) {
      return {
        ok: false,
        error: 'Memo does not match this Ghost Race run.',
        status: 400,
      };
    }

    const feeLamports = tx.meta?.fee ?? null;
    let feeUsd: number | null = null;
    if (feeLamports != null) {
      const solPrice = await fetchSolPriceUsd();
      feeUsd = (feeLamports / 1_000_000_000) * solPrice;
    }

    const slot = tx.slot ?? clientSlot;
    const userId = await resolveUserId(supabase, walletAddress, telegramId);

    const run = await createGhostRaceRun(supabase, {
      userId,
      walletAddress,
      signature,
      raceNonce,
      durationMs: Math.round(durationMs),
      slot,
      feeLamports,
      feeUsd,
      cluster: String(cluster),
      explorerUrl: explorerUrl(signature, String(cluster)),
    });

    if (userId) {
      await creditGhostRaceQuest(supabase, userId);
    }

    const resultUrl = `${origin}/ghost-race/result/${run.id}`;
    try {
      await setGhostRaceResultUrl(supabase, run.id, resultUrl);
    } catch (err) {
      console.error('[ghost-race] could not store result url', err);
    }

    let rank: number | null = null;
    let total = 0;
    try {
      const r = await getGhostRaceRank(supabase, run.duration_ms);
      rank = r.rank;
      total = r.total;
    } catch {
      /* best-effort */
    }

    return resultPayload(
      { ...run, result_card_url: resultUrl },
      origin,
      { feeUsd, feeLamports, rank, total }
    );
  } catch (err) {
    console.error('[ghost-race] persist error', err);
    return {
      ok: false,
      error: 'Could not save your race. Please try again.',
      status: 500,
    };
  }
}

/** Parse start ms from Blink nonce format `${Date.now()}-${uuid}`. */
export function durationMsFromBlinkNonce(
  raceNonce: string,
  nowMs = Date.now()
): number | null {
  const dash = raceNonce.indexOf('-');
  if (dash <= 0) return null;
  const start = Number(raceNonce.slice(0, dash));
  if (!Number.isFinite(start) || start <= 0) return null;
  const raw = nowMs - start;
  // Reject missing/stale nonces (wallet UI can exceed 60s — we clamp for leaderboard)
  if (raw < 0 || raw > 5 * 60_000) return null;
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, raw));
}

export function newBlinkRaceNonce(): string {
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2, 10)}`;
  return `${Date.now()}-${id}`;
}
