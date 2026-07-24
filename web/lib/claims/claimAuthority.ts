import 'server-only';

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/** Load claim distributor authority keypair from CLAIM_AUTHORITY_SECRET. */
export function getClaimAuthorityKeypair(): Keypair | null {
  const raw = process.env.CLAIM_AUTHORITY_SECRET?.trim();
  if (!raw) return null;
  try {
    if (raw.startsWith('[')) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
    }
    return Keypair.fromSecretKey(bs58.decode(raw));
  } catch {
    return null;
  }
}

export function getClaimAuthorityPubkey(): string | null {
  const kp = getClaimAuthorityKeypair();
  if (kp) return kp.publicKey.toBase58();
  return process.env.CLAIM_AUTHORITY?.trim() || null;
}
