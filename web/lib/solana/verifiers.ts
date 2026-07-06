import { Connection, PublicKey } from '@solana/web3.js';
import { getConnection } from './connection';
import {
  GLEAN_BADGE_NAME,
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

function getAllInstructions(
  tx: NonNullable<Awaited<ReturnType<Connection['getParsedTransaction']>>>
) {
  const message = tx.transaction.message;
  return [
    ...message.instructions,
    ...(tx.meta?.innerInstructions?.flatMap((i) => i.instructions) ?? []),
  ];
}

async function scanSignaturesForProgram(
  walletAddress: string,
  programIds: Set<string>,
  conn: Connection,
  options?: { excludeSignatures?: Set<string>; limit?: number }
): Promise<string | null> {
  const owner = toPublicKey(walletAddress);
  const limit = options?.limit ?? SIGNATURE_SCAN_LIMIT;
  const exclude = options?.excludeSignatures ?? new Set<string>();
  const sigs = await conn.getSignaturesForAddress(owner, { limit });

  for (const sigInfo of sigs) {
    if (sigInfo.err || exclude.has(sigInfo.signature)) continue;
    const tx = await conn.getParsedTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) continue;

    const hit = getAllInstructions(tx).some((ix) =>
      programIds.has(ix.programId.toBase58())
    );
    if (hit) return sigInfo.signature;
  }
  return null;
}

async function scanAllMatchingSignatures(
  walletAddress: string,
  programIds: Set<string>,
  conn: Connection,
  limit = SIGNATURE_SCAN_LIMIT
): Promise<string[]> {
  const owner = toPublicKey(walletAddress);
  const sigs = await conn.getSignaturesForAddress(owner, { limit });
  const found: string[] = [];

  for (const sigInfo of sigs) {
    if (sigInfo.err) continue;
    const tx = await conn.getParsedTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) continue;
    const hit = getAllInstructions(tx).some((ix) =>
      programIds.has(ix.programId.toBase58())
    );
    if (hit) found.push(sigInfo.signature);
  }
  return found;
}

function hasMetadataCreateInstruction(
  tx: NonNullable<Awaited<ReturnType<Connection['getParsedTransaction']>>>
): boolean {
  for (const ix of getAllInstructions(tx)) {
    if (ix.programId.toBase58() !== TOKEN_METADATA_PROGRAM_ID) continue;
    if ('parsed' in ix && ix.parsed) {
      const type = (ix.parsed as { type?: string }).type ?? '';
      if (/create|mint|metadata/i.test(type)) return true;
    }
    // Unparsed metadata CPI still counts as NFT activity.
    if (!('parsed' in ix)) return true;
  }
  return false;
}

export async function verifyTokenSwap(
  walletAddress: string,
  conn: Connection = getConnection(),
  excludeSignatures: Set<string> = new Set()
): Promise<VerifyResult> {
  const sig = await scanSignaturesForProgram(
    walletAddress,
    SWAP_PROGRAM_IDS,
    conn,
    { excludeSignatures }
  );
  return sig
    ? { passed: true, detail: 'Found a swap via a known DEX.', txSignature: sig }
    : {
        passed: false,
        detail: `No swap found in the last ${SIGNATURE_SCAN_LIMIT} transactions.`,
      };
}

export async function verifySecondTokenSwap(
  walletAddress: string,
  conn: Connection = getConnection(),
  excludeSignatures: Set<string> = new Set()
): Promise<VerifyResult> {
  const sigs = await scanAllMatchingSignatures(walletAddress, SWAP_PROGRAM_IDS, conn);
  const second = sigs.find((s) => !excludeSignatures.has(s));
  return second
    ? { passed: true, detail: 'Found a second distinct swap.', txSignature: second }
    : {
        passed: false,
        detail: 'Complete a new swap that differs from your first swap quest.',
      };
}

export async function verifyNftMint(
  walletAddress: string,
  conn: Connection = getConnection(),
  excludeSignatures: Set<string> = new Set()
): Promise<VerifyResult> {
  const owner = toPublicKey(walletAddress);
  const sigs = await conn.getSignaturesForAddress(owner, {
    limit: SIGNATURE_SCAN_LIMIT,
  });

  for (const sigInfo of sigs) {
    if (sigInfo.err || excludeSignatures.has(sigInfo.signature)) continue;
    const tx = await conn.getParsedTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) continue;
    if (hasMetadataCreateInstruction(tx)) {
      return {
        passed: true,
        detail: 'Found an NFT mint/metadata create action.',
        txSignature: sigInfo.signature,
      };
    }
  }

  return {
    passed: false,
    detail: `No NFT mint found in the last ${SIGNATURE_SCAN_LIMIT} transactions.`,
  };
}

export async function verifyGleanFighterBadge(
  walletAddress: string,
  conn: Connection = getConnection()
): Promise<VerifyResult> {
  const owner = toPublicKey(walletAddress);
  const sigs = await conn.getSignaturesForAddress(owner, { limit: SIGNATURE_SCAN_LIMIT });

  for (const sigInfo of sigs) {
    if (sigInfo.err) continue;
    const tx = await conn.getParsedTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx) continue;

    const touchesMetadata = getAllInstructions(tx).some(
      (ix) => ix.programId.toBase58() === TOKEN_METADATA_PROGRAM_ID
    );
    if (!touchesMetadata) continue;

    const logs = tx.meta?.logMessages ?? [];
    const logHit = logs.some((l) => l.includes(GLEAN_BADGE_NAME));
    if (logHit || hasMetadataCreateInstruction(tx)) {
      return {
        passed: true,
        detail: 'Glean Fighter Badge mint detected.',
        txSignature: sigInfo.signature,
      };
    }
  }

  return {
    passed: false,
    detail: 'Mint your Glean Fighter Badge from the Wallet Wars mint page.',
  };
}

export async function verifySolStake(
  walletAddress: string,
  conn: Connection = getConnection(),
  excludeSignatures: Set<string> = new Set()
): Promise<VerifyResult> {
  const sig = await scanSignaturesForProgram(
    walletAddress,
    new Set([STAKE_PROGRAM_ID]),
    conn,
    { excludeSignatures }
  );
  return sig
    ? { passed: true, detail: 'Found a staking action.', txSignature: sig }
    : {
        passed: false,
        detail: `No staking activity found in the last ${SIGNATURE_SCAN_LIMIT} transactions.`,
      };
}

export async function verifySecondSolStake(
  walletAddress: string,
  conn: Connection = getConnection(),
  excludeSignatures: Set<string> = new Set()
): Promise<VerifyResult> {
  const sigs = await scanAllMatchingSignatures(
    walletAddress,
    new Set([STAKE_PROGRAM_ID]),
    conn
  );
  const second = sigs.find((s) => !excludeSignatures.has(s));
  return second
    ? { passed: true, detail: 'Found a second distinct stake action.', txSignature: second }
    : {
        passed: false,
        detail: 'Stake again with a new transaction to complete this quest.',
      };
}
