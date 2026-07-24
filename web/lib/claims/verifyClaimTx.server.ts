import 'server-only';

import { PublicKey } from '@solana/web3.js';
import { getConnection } from '@/lib/solana/connection';
import { normalizeCluster } from '@/lib/solana/cluster';
import { claimStatusPda, distributorPda } from '@/lib/claims/distributor';

export async function verifyClaimTransaction(params: {
  claimTx: string;
  programId: string;
  mint: string;
  leafIndex: number;
}): Promise<void> {
  const cluster = normalizeCluster(process.env.SOLANA_CLUSTER);
  const conn = getConnection({ cluster });

  const tx = await conn.getTransaction(params.claimTx, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) {
    throw new Error('Claim transaction not found on-chain.');
  }
  if (tx.meta?.err) {
    throw new Error('Claim transaction failed on-chain.');
  }

  const programId = new PublicKey(params.programId);
  const mint = new PublicKey(params.mint);
  const distributor = distributorPda(programId, mint);
  const claimStatus = claimStatusPda(programId, distributor, params.leafIndex);

  const statusInfo = await conn.getAccountInfo(claimStatus, 'confirmed');
  if (!statusInfo) {
    throw new Error('Claim status account not initialized — claim may not have succeeded.');
  }
}
