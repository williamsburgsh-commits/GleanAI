import 'server-only';

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  createApproveInstruction,
  createFreezeAccountInstruction,
  createRevokeInstruction,
  createThawAccountInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from '@solana/spl-token';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  freezeDelegatedAccount,
  mplTokenMetadata,
  thawDelegatedAccount,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  createSignerFromKeypair,
  signerIdentity,
} from '@metaplex-foundation/umi';
import {
  fromWeb3JsKeypair,
  fromWeb3JsPublicKey,
  toWeb3JsInstruction,
} from '@metaplex-foundation/umi-web3js-adapters';
import bs58 from 'bs58';

export type StakeMode = 'owner_freeze' | 'delegate_freeze';

export interface StakeBuildResult {
  transaction: Transaction;
  mint: string;
  tokenAccount: string;
  mode: StakeMode;
  needsAuthoritySignature: boolean;
}

function getStakingAuthorityKeypair(): Keypair | null {
  const raw = process.env.STAKING_AUTHORITY?.trim();
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

export function getStakingAuthorityPubkey(): PublicKey | null {
  const kp = getStakingAuthorityKeypair();
  if (kp) return kp.publicKey;
  const pub = process.env.STAKING_AUTHORITY_PUBKEY?.trim();
  if (!pub) return null;
  try {
    return new PublicKey(pub);
  } catch {
    return null;
  }
}

export async function isBadgeTokenFrozen(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey
): Promise<boolean> {
  const ata = getAssociatedTokenAddressSync(mint, owner);
  try {
    const acc = await getAccount(connection, ata);
    return Boolean(acc.isFrozen);
  } catch {
    return false;
  }
}

async function resolveMode(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey
): Promise<{ mode: StakeMode; freezeAuthority: PublicKey }> {
  const mintInfo = await getMint(connection, mint);
  if (!mintInfo.freezeAuthority) {
    throw new Error(
      'This Fighter Badge has no freeze authority — it cannot be staked. Remint a new badge.'
    );
  }
  const freezeAuthority = mintInfo.freezeAuthority;
  if (freezeAuthority.equals(owner)) {
    return { mode: 'owner_freeze', freezeAuthority };
  }
  const stakingAuth = getStakingAuthorityPubkey();
  if (stakingAuth && freezeAuthority.equals(stakingAuth)) {
    return { mode: 'delegate_freeze', freezeAuthority };
  }
  throw new Error(
    `Freeze authority ${freezeAuthority.toBase58().slice(0, 8)}… is not your wallet or STAKING_AUTHORITY.`
  );
}

export async function buildStakeTransaction(params: {
  connection: Connection;
  owner: PublicKey;
  mint: PublicKey;
  blockhash: string;
  lastValidBlockHeight: number;
}): Promise<StakeBuildResult> {
  const { connection, owner, mint, blockhash, lastValidBlockHeight } = params;
  const ata = getAssociatedTokenAddressSync(mint, owner);
  const acc = await getAccount(connection, ata);
  if (acc.isFrozen) {
    throw new Error('Badge is already frozen (staked).');
  }

  const { mode, freezeAuthority } = await resolveMode(connection, mint, owner);
  const transaction = new Transaction({
    feePayer: owner,
    blockhash,
    lastValidBlockHeight,
  });

  if (mode === 'owner_freeze') {
    transaction.add(createFreezeAccountInstruction(ata, mint, owner));
    return {
      transaction,
      mint: mint.toBase58(),
      tokenAccount: ata.toBase58(),
      mode,
      needsAuthoritySignature: false,
    };
  }

  const authorityKp = getStakingAuthorityKeypair();
  if (!authorityKp) {
    throw new Error('STAKING_AUTHORITY secret is required for delegate freeze.');
  }

  transaction.add(createApproveInstruction(ata, freezeAuthority, owner, 1));

  const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());
  const authSigner = createSignerFromKeypair(umi, fromWeb3JsKeypair(authorityKp));
  umi.use(signerIdentity(authSigner));

  const builder = freezeDelegatedAccount(umi, {
    delegate: authSigner,
    tokenAccount: fromWeb3JsPublicKey(ata),
    mint: fromWeb3JsPublicKey(mint),
  });
  for (const ix of builder.getInstructions()) {
    transaction.add(toWeb3JsInstruction(ix));
  }
  transaction.partialSign(authorityKp);

  return {
    transaction,
    mint: mint.toBase58(),
    tokenAccount: ata.toBase58(),
    mode,
    needsAuthoritySignature: true,
  };
}

export async function buildUnstakeTransaction(params: {
  connection: Connection;
  owner: PublicKey;
  mint: PublicKey;
  blockhash: string;
  lastValidBlockHeight: number;
}): Promise<StakeBuildResult> {
  const { connection, owner, mint, blockhash, lastValidBlockHeight } = params;
  const ata = getAssociatedTokenAddressSync(mint, owner);
  const acc = await getAccount(connection, ata);
  if (!acc.isFrozen) {
    throw new Error('Badge is not frozen — nothing to unstake.');
  }

  const { mode } = await resolveMode(connection, mint, owner);
  const transaction = new Transaction({
    feePayer: owner,
    blockhash,
    lastValidBlockHeight,
  });

  if (mode === 'owner_freeze') {
    transaction.add(createThawAccountInstruction(ata, mint, owner));
    return {
      transaction,
      mint: mint.toBase58(),
      tokenAccount: ata.toBase58(),
      mode,
      needsAuthoritySignature: false,
    };
  }

  const authorityKp = getStakingAuthorityKeypair();
  if (!authorityKp) {
    throw new Error('STAKING_AUTHORITY secret is required for delegate thaw.');
  }

  const umi = createUmi(connection.rpcEndpoint).use(mplTokenMetadata());
  const authSigner = createSignerFromKeypair(umi, fromWeb3JsKeypair(authorityKp));
  umi.use(signerIdentity(authSigner));

  const builder = thawDelegatedAccount(umi, {
    delegate: authSigner,
    tokenAccount: fromWeb3JsPublicKey(ata),
    mint: fromWeb3JsPublicKey(mint),
  });
  for (const ix of builder.getInstructions()) {
    transaction.add(toWeb3JsInstruction(ix));
  }
  transaction.add(createRevokeInstruction(ata, owner));
  transaction.partialSign(authorityKp);

  return {
    transaction,
    mint: mint.toBase58(),
    tokenAccount: ata.toBase58(),
    mode,
    needsAuthoritySignature: true,
  };
}

export function serializeTxBase64(tx: Transaction): string {
  const raw = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  return Buffer.from(raw).toString('base64');
}
