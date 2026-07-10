import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

/** SPL Memo program (v1). */
export const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);

export const GHOST_RACE_MEMO_PREFIX = 'glean:ghost-race:';
export const BOSS_CHALLENGE_MEMO_PREFIX = 'glean:boss-challenge:';

export function buildGhostRaceMemo(raceNonce: string): string {
  return `${GHOST_RACE_MEMO_PREFIX}${raceNonce}`;
}

export function buildBossChallengeMemo(bossSlug: string): string {
  return `${BOSS_CHALLENGE_MEMO_PREFIX}${bossSlug}`;
}

export function createMemoInstruction(
  memo: string,
  signer: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    // web3.js expects Buffer; Uint8Array is accepted at runtime
    data: Buffer.from(memo, 'utf8'),
  });
}

async function buildMemoTransaction(params: {
  connection: Connection;
  payer: PublicKey;
  memo: string;
}): Promise<{ transaction: Transaction; memo: string }> {
  const transaction = new Transaction().add(
    createMemoInstruction(params.memo, params.payer)
  );
  transaction.feePayer = params.payer;
  const { blockhash } = await params.connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  return { transaction, memo: params.memo };
}

export async function buildGhostRaceMemoTransaction(params: {
  connection: Connection;
  payer: PublicKey;
  raceNonce: string;
}): Promise<{ transaction: Transaction; memo: string }> {
  return buildMemoTransaction({
    connection: params.connection,
    payer: params.payer,
    memo: buildGhostRaceMemo(params.raceNonce),
  });
}

export async function buildBossChallengeMemoTransaction(params: {
  connection: Connection;
  payer: PublicKey;
  bossSlug: string;
}): Promise<{ transaction: Transaction; memo: string }> {
  return buildMemoTransaction({
    connection: params.connection,
    payer: params.payer,
    memo: buildBossChallengeMemo(params.bossSlug),
  });
}
