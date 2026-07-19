import {
  MIN_FUNDED_LAMPORTS,
  STAKE_PROGRAM_ID,
  SWAP_PROGRAM_IDS,
  TOKEN_METADATA_PROGRAM_ID,
} from '@/lib/solana/programs';
import type { VerificationType } from '@/lib/solana/verify';

export interface ParsedEnhancedTx {
  signature: string;
  type: string;
  walletsInvolved: Set<string>;
  programIds: Set<string>;
  /** Net SOL received by wallet (lamports), keyed by address */
  nativeInByWallet: Map<string, number>;
  candidateTypes: VerificationType[];
}

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as UnknownRecord) : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function collectNativeParties(tx: UnknownRecord): string[] {
  const out: string[] = [];
  for (const row of asArray(tx.nativeTransfers)) {
    const r = asRecord(row);
    const from = str(r?.fromUserAccount);
    const to = str(r?.toUserAccount);
    if (from) out.push(from);
    if (to) out.push(to);
  }
  return out;
}

function collectProgramIds(tx: UnknownRecord): Set<string> {
  const programs = new Set<string>();
  const instructions = asArray(tx.instructions);
  for (const ix of instructions) {
    const r = asRecord(ix);
    const pid = str(r?.programId);
    if (pid) programs.add(pid);
  }
  const inner = asArray(tx.innerInstructions);
  for (const group of inner) {
    const g = asRecord(group);
    for (const ix of asArray(g?.instructions)) {
      const r = asRecord(ix);
      const pid = str(r?.programId);
      if (pid) programs.add(pid);
    }
  }
  return programs;
}

function collectNativeIn(tx: UnknownRecord): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of asArray(tx.nativeTransfers)) {
    const r = asRecord(row);
    const to = str(r?.toUserAccount);
    const amount = Number(r?.amount ?? 0);
    if (!to || !Number.isFinite(amount) || amount <= 0) continue;
    map.set(to, (map.get(to) ?? 0) + amount);
  }
  return map;
}

function collectTokenAccounts(tx: UnknownRecord): string[] {
  const out: string[] = [];
  for (const row of asArray(tx.tokenTransfers)) {
    const r = asRecord(row);
    const from = str(r?.fromUserAccount);
    const to = str(r?.toUserAccount);
    if (from) out.push(from);
    if (to) out.push(to);
  }
  return out;
}

/**
 * Map Helius enhanced tx type + program IDs to Glean verification types.
 */
export function candidateTypesForTx(
  type: string,
  programIds: Set<string>,
  nativeInByWallet: Map<string, number>
): VerificationType[] {
  const types = new Set<VerificationType>();
  const upper = type.toUpperCase();

  const hasSwapProgram = [...programIds].some((p) => SWAP_PROGRAM_IDS.has(p));
  const hasStake = programIds.has(STAKE_PROGRAM_ID);
  const hasMetadata = programIds.has(TOKEN_METADATA_PROGRAM_ID);

  if (
    upper.includes('SWAP') ||
    hasSwapProgram ||
    upper === 'TOKEN_SWAP' ||
    upper === 'JUPITER'
  ) {
    types.add('token_swap');
  }
  if (
    upper.includes('STAKE') ||
    upper === 'DELEGATE' ||
    hasStake
  ) {
    types.add('sol_stake');
  }
  if (
    upper.includes('NFT') ||
    upper.includes('MINT') ||
    upper === 'COMPRESSED_NFT_MINT' ||
    hasMetadata
  ) {
    types.add('nft_mint');
  }

  for (const lamports of nativeInByWallet.values()) {
    if (lamports >= MIN_FUNDED_LAMPORTS) {
      types.add('wallet_funded');
      break;
    }
  }
  if (upper === 'TRANSFER' || upper === 'SOL_TRANSFER') {
    // Fund check handled via nativeIn; still mark if inbound SOL present.
    for (const lamports of nativeInByWallet.values()) {
      if (lamports > 0) {
        types.add('wallet_funded');
        break;
      }
    }
  }

  return [...types];
}

export function parseEnhancedTransaction(raw: unknown): ParsedEnhancedTx | null {
  const tx = asRecord(raw);
  if (!tx) return null;

  const signature =
    str(tx.signature) || str(tx.transactionSignature) || str(tx.txHash);
  if (!signature) return null;

  const type = (str(tx.type) || str(tx.transactionType) || 'UNKNOWN').toUpperCase();
  const programIds = collectProgramIds(tx);
  const nativeInByWallet = collectNativeIn(tx);

  // Only user-facing parties — not every account key in the tx.
  const walletsInvolved = new Set<string>([
    ...collectNativeParties(tx),
    ...collectTokenAccounts(tx),
    ...nativeInByWallet.keys(),
  ]);
  const feePayer = str(tx.feePayer);
  if (feePayer) walletsInvolved.add(feePayer);

  const candidateTypes = candidateTypesForTx(type, programIds, nativeInByWallet);

  return {
    signature,
    type,
    walletsInvolved,
    programIds,
    nativeInByWallet,
    candidateTypes,
  };
}

export function normalizeWebhookPayload(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const rec = asRecord(body);
  if (!rec) return [];
  if (Array.isArray(rec.transactions)) return rec.transactions;
  if (str(rec.signature) || str(rec.transactionSignature)) return [body];
  return [];
}
