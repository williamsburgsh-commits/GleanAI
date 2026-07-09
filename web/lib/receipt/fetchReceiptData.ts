import { Connection, PublicKey } from '@solana/web3.js';
import { getConnection } from '@/lib/solana/connection';

const MS_PER_DAY = 86_400_000;
const TX_COUNT_CAP = 10_000;
const FEE_PARSE_CAP = 400;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 50;

export interface ReceiptScanResult {
  txCount: number;
  txCountCapped: boolean;
  solFeesLamports: number;
  walletAgeDays: number;
  feeSampleSize: number;
  isFeeExtrapolated: boolean;
  firstTxTimestamp: number | null;
}

function toPublicKey(address: string): PublicKey {
  return new PublicKey(address);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function paginateSignatures(
  conn: Connection,
  owner: PublicKey
): Promise<{ signatures: string[]; capped: boolean }> {
  const signatures: string[] = [];
  let before: string | undefined;

  while (signatures.length < TX_COUNT_CAP) {
    const batch = await conn.getSignaturesForAddress(owner, {
      limit: Math.min(1000, TX_COUNT_CAP - signatures.length),
      before,
    });
    if (batch.length === 0) break;
    for (const s of batch) signatures.push(s.signature);
    before = batch[batch.length - 1]?.signature;
    if (batch.length < 1000) break;
  }

  return {
    signatures,
    capped: signatures.length >= TX_COUNT_CAP,
  };
}

function pickFeeSampleIndices(total: number, sampleSize: number): number[] {
  if (total <= sampleSize) {
    return Array.from({ length: total }, (_, i) => i);
  }
  const indices: number[] = [];
  const step = total / sampleSize;
  for (let i = 0; i < sampleSize; i += 1) {
    indices.push(Math.min(total - 1, Math.floor(i * step)));
  }
  return [...new Set(indices)].sort((a, b) => a - b);
}

async function sumFeesForSignatures(
  conn: Connection,
  signatures: string[]
): Promise<number> {
  let totalLamports = 0;

  for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
    const chunk = signatures.slice(i, i + BATCH_SIZE);
    const txs = await Promise.all(
      chunk.map((sig) =>
        conn.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0 })
      )
    );
    for (const tx of txs) {
      if (tx?.meta?.fee != null) totalLamports += tx.meta.fee;
    }
    if (i + BATCH_SIZE < signatures.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return totalLamports;
}

export async function fetchReceiptData(
  walletAddress: string,
  conn: Connection = getConnection()
): Promise<ReceiptScanResult> {
  const owner = toPublicKey(walletAddress);
  const { signatures, capped } = await paginateSignatures(conn, owner);
  const txCount = signatures.length;

  if (txCount === 0) {
    return {
      txCount: 0,
      txCountCapped: false,
      solFeesLamports: 0,
      walletAgeDays: 0,
      feeSampleSize: 0,
      isFeeExtrapolated: false,
      firstTxTimestamp: null,
    };
  }

  // Wallet age from oldest signature in the paginated set.
  let firstTxTimestamp: number | null = null;
  const oldestSig = signatures[signatures.length - 1];
  if (oldestSig) {
    const oldest = await conn.getParsedTransaction(oldestSig, {
      maxSupportedTransactionVersion: 0,
    });
    firstTxTimestamp = oldest?.blockTime ?? null;
  }

  const walletAgeDays =
    firstTxTimestamp != null
      ? Math.max(0, Math.floor((Date.now() - firstTxTimestamp * 1000) / MS_PER_DAY))
      : 0;

  const sampleIndices = pickFeeSampleIndices(txCount, FEE_PARSE_CAP);
  const sampleSigs = sampleIndices.map((i) => signatures[i]!);
  const sampledFees = await sumFeesForSignatures(conn, sampleSigs);
  const feeSampleSize = sampleSigs.length;
  const isFeeExtrapolated = txCount > feeSampleSize;

  const solFeesLamports = isFeeExtrapolated
    ? Math.round((sampledFees / feeSampleSize) * txCount)
    : sampledFees;

  return {
    txCount,
    txCountCapped: capped,
    solFeesLamports,
    walletAgeDays,
    feeSampleSize,
    isFeeExtrapolated,
    firstTxTimestamp,
  };
}
