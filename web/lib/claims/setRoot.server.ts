import 'server-only';

import { PublicKey, Transaction } from '@solana/web3.js';
import { getConnection } from '@/lib/solana/connection';
import { normalizeCluster } from '@/lib/solana/cluster';
import { buildSetRootIx } from '@/lib/claims/distributor';
import { getClaimAuthorityKeypair } from '@/lib/claims/claimAuthority';
import type { ClaimEpochRow } from '@/lib/claims/publish.server';

export async function setClaimRootOnchain(epoch: ClaimEpochRow): Promise<string> {
  const programIdStr =
    process.env.CLAIM_PROGRAM_ID?.trim() ||
    process.env.NEXT_PUBLIC_CLAIM_PROGRAM_ID?.trim() ||
    '';
  if (!programIdStr) {
    throw new Error('CLAIM_PROGRAM_ID is not configured.');
  }

  const authority = getClaimAuthorityKeypair();
  if (!authority) {
    throw new Error(
      'CLAIM_AUTHORITY_SECRET is not configured — cannot sign set_root on the server.'
    );
  }

  const expectedPubkey = process.env.CLAIM_AUTHORITY?.trim();
  if (expectedPubkey && authority.publicKey.toBase58() !== expectedPubkey) {
    throw new Error('CLAIM_AUTHORITY_SECRET does not match CLAIM_AUTHORITY pubkey.');
  }

  const mintStr = epoch.mint?.trim();
  if (!mintStr) {
    throw new Error('Claim epoch has no mint.');
  }

  const programId = new PublicKey(programIdStr);
  const mint = new PublicKey(mintStr);
  const ix = buildSetRootIx({
    programId,
    authority: authority.publicKey,
    mint,
    rootHex: epoch.merkle_root,
  });

  const cluster = normalizeCluster(process.env.SOLANA_CLUSTER);
  const conn = getConnection({ cluster });
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');

  const tx = new Transaction({
    feePayer: authority.publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(ix);

  tx.sign(authority);
  const sig = await conn.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });

  await conn.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  return sig;
}
