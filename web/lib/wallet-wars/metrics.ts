import { Connection, PublicKey } from '@solana/web3.js';
import { getConnection } from '@/lib/solana/connection';
import {
  STAKE_PROGRAM_ID,
  SWAP_PROGRAM_IDS,
  TOKEN_METADATA_PROGRAM_ID,
  WALLET_SCAN_SIGNATURE_LIMIT,
} from '@/lib/solana/programs';

export interface WalletMetrics {
  balanceLamports: number;
  walletAgeDays: number;
  totalTxCount: number;
  uniquePrograms: number;
  recentSwapCount: number;
  nftActionCount: number;
  txsLast14Days: number;
  stakeActionCount: number;
  firstTxTimestamp: number | null;
}

const MS_PER_DAY = 86_400_000;
const SWAP_WINDOW_MS = 30 * MS_PER_DAY;
const AGILITY_WINDOW_MS = 14 * MS_PER_DAY;

function toPublicKey(address: string): PublicKey {
  return new PublicKey(address);
}

function collectProgramIds(tx: NonNullable<Awaited<ReturnType<Connection['getParsedTransaction']>>>): string[] {
  const message = tx.transaction.message;
  const instructions = [
    ...message.instructions,
    ...(tx.meta?.innerInstructions?.flatMap((i) => i.instructions) ?? []),
  ];
  return instructions.map((ix) => ix.programId.toBase58());
}

export async function fetchWalletMetrics(
  walletAddress: string,
  conn: Connection = getConnection()
): Promise<WalletMetrics> {
  const owner = toPublicKey(walletAddress);
  const balanceLamports = await conn.getBalance(owner, 'confirmed');

  const sigs: { signature: string; blockTime: number | null }[] = [];
  let before: string | undefined;
  const target = WALLET_SCAN_SIGNATURE_LIMIT;

  while (sigs.length < target) {
    const batch = await conn.getSignaturesForAddress(owner, {
      limit: Math.min(25, target - sigs.length),
      before,
    });
    if (batch.length === 0) break;
    for (const s of batch) {
      sigs.push({ signature: s.signature, blockTime: s.blockTime ?? null });
    }
    before = batch[batch.length - 1]?.signature;
    if (batch.length < 25) break;
  }

  const now = Date.now();
  const programSet = new Set<string>();
  let recentSwapCount = 0;
  let nftActionCount = 0;
  let stakeActionCount = 0;
  let txsLast14Days = 0;

  const firstTxTimestamp =
    sigs.length > 0 ? (sigs[sigs.length - 1]?.blockTime ?? null) : null;

  for (const sigInfo of sigs) {
    if (sigInfo.blockTime) {
      const age = now - sigInfo.blockTime * 1000;
      if (age <= AGILITY_WINDOW_MS) txsLast14Days += 1;
    }
  }

  const scanLimit = Math.min(sigs.length, 50);
  for (let i = 0; i < scanLimit; i += 1) {
    const sigInfo = sigs[i];
    const tx = await conn.getParsedTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx || tx.meta?.err) continue;

    const programs = collectProgramIds(tx);
    for (const pid of programs) programSet.add(pid);

    const blockMs = (sigInfo.blockTime ?? 0) * 1000;
    const inSwapWindow = blockMs > 0 && now - blockMs <= SWAP_WINDOW_MS;

    if (inSwapWindow && programs.some((p) => SWAP_PROGRAM_IDS.has(p))) {
      recentSwapCount += 1;
    }
    if (programs.includes(TOKEN_METADATA_PROGRAM_ID)) nftActionCount += 1;
    if (programs.includes(STAKE_PROGRAM_ID)) stakeActionCount += 1;
  }

  const walletAgeDays =
    firstTxTimestamp != null
      ? Math.max(0, Math.floor((now - firstTxTimestamp * 1000) / MS_PER_DAY))
      : 0;

  return {
    balanceLamports,
    walletAgeDays,
    totalTxCount: sigs.length,
    uniquePrograms: programSet.size,
    recentSwapCount,
    nftActionCount,
    txsLast14Days,
    stakeActionCount,
    firstTxTimestamp,
  };
}
