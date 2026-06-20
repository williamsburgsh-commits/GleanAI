import { Connection, PublicKey } from '@solana/web3.js';
import { getConnection } from './connection';
import {
  MIN_FUNDED_LAMPORTS,
  SIGNATURE_SCAN_LIMIT,
  STAKE_PROGRAM_ID,
  SWAP_PROGRAM_IDS,
  TOKEN_METADATA_PROGRAM_ID,
} from './programs';

export interface VerifyResult {
  passed: boolean;
  detail: string;
  txSignature?: string | null;
}

function toPublicKey(address: string): PublicKey {
  try {
    return new PublicKey(address);
  } catch {
    throw new Error(`Invalid Solana address: ${address}`);
  }
}

// Wallet holds at least the minimum SOL.
export async function verifyWalletFunded(
  walletAddress: string,
  conn: Connection = getConnection()
): Promise<VerifyResult> {
  const owner = toPublicKey(walletAddress);
  const lamports = await conn.getBalance(owner, 'confirmed');
  const passed = lamports >= MIN_FUNDED_LAMPORTS;
  return {
    passed,
    detail: passed
      ? `Balance ${(lamports / 1e9).toFixed(4)} SOL meets the minimum.`
      : `Balance ${(lamports / 1e9).toFixed(4)} SOL is below the ${(
          MIN_FUNDED_LAMPORTS / 1e9
        ).toFixed(2)} SOL minimum.`,
  };
}

// Scans recent transactions for an instruction touching a known program set.
async function scanRecentForProgram(
  walletAddress: string,
  programIds: Set<string>,
  conn: Connection
): Promise<string | null> {
  const owner = toPublicKey(walletAddress);
  const sigs = await conn.getSignaturesForAddress(owner, {
    limit: SIGNATURE_SCAN_LIMIT,
  });

  for (const sigInfo of sigs) {
    if (sigInfo.err) continue;
    const tx = await conn.getParsedTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) continue;

    const message = tx.transaction.message;
    const instructions = [
      ...message.instructions,
      ...(tx.meta?.innerInstructions?.flatMap((i) => i.instructions) ?? []),
    ];
    const hit = instructions.some((ix) =>
      programIds.has(ix.programId.toBase58())
    );
    if (hit) return sigInfo.signature;
  }
  return null;
}

// A swap = a recent tx invoking a known DEX program.
export async function verifyTokenSwap(
  walletAddress: string,
  conn: Connection = getConnection()
): Promise<VerifyResult> {
  const sig = await scanRecentForProgram(walletAddress, SWAP_PROGRAM_IDS, conn);
  return sig
    ? { passed: true, detail: 'Found a swap via a known DEX.', txSignature: sig }
    : {
        passed: false,
        detail: `No swap found in the last ${SIGNATURE_SCAN_LIMIT} transactions.`,
      };
}

// An NFT mint = a recent tx invoking the Token Metadata program.
export async function verifyNftMint(
  walletAddress: string,
  conn: Connection = getConnection()
): Promise<VerifyResult> {
  const sig = await scanRecentForProgram(
    walletAddress,
    new Set([TOKEN_METADATA_PROGRAM_ID]),
    conn
  );
  return sig
    ? { passed: true, detail: 'Found an NFT mint/metadata action.', txSignature: sig }
    : {
        passed: false,
        detail: `No NFT mint found in the last ${SIGNATURE_SCAN_LIMIT} transactions.`,
      };
}

// A stake action = a recent tx invoking the native Stake program.
// We scan recent signatures (bounded) instead of getProgramAccounts, which is
// far too compute-heavy on the Stake program and gets rate-limited.
export async function verifySolStake(
  walletAddress: string,
  conn: Connection = getConnection()
): Promise<VerifyResult> {
  const sig = await scanRecentForProgram(
    walletAddress,
    new Set([STAKE_PROGRAM_ID]),
    conn
  );
  return sig
    ? { passed: true, detail: 'Found a staking action.', txSignature: sig }
    : {
        passed: false,
        detail: `No staking activity found in the last ${SIGNATURE_SCAN_LIMIT} transactions.`,
      };
}
