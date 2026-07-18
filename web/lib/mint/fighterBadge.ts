import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  createNft,
  mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import {
  createNoopSigner,
  generateSigner,
  percentAmount,
  signerIdentity,
} from '@metaplex-foundation/umi';
import {
  fromWeb3JsPublicKey,
  toWeb3JsInstruction,
  toWeb3JsPublicKey,
} from '@metaplex-foundation/umi-web3js-adapters';
import { GLEAN_BADGE_NAME, GLEAN_BADGE_SYMBOL } from '@/lib/solana/programs';

export interface MintBadgeParams {
  /** Used only for Umi program registry / cluster hint (RPC calls avoided for ix build). */
  connection: Connection;
  payer: PublicKey;
  metadataUri: string;
  /** On-chain metadata name (≤32 chars). Defaults to GLEAN_BADGE_NAME. */
  name?: string;
  /** Recent blockhash from server (required — do not use public browser RPC). */
  blockhash: string;
  lastValidBlockHeight: number;
}

export async function buildFighterBadgeMintTransaction(
  params: MintBadgeParams
): Promise<{ transaction: Transaction; mint: PublicKey }> {
  const {
    connection,
    payer,
    metadataUri,
    blockhash,
    lastValidBlockHeight,
  } = params;
  const name = (params.name || GLEAN_BADGE_NAME).slice(0, 32);

  const umi = createUmi(connection.rpcEndpoint)
    .use(mplTokenMetadata())
    .use(mplToolbox())
    .use(signerIdentity(createNoopSigner(fromWeb3JsPublicKey(payer))));

  // Must be a full Umi KeypairSigner (generateSigner). fromWeb3JsKeypair alone
  // fails isSigner() and CreateV1 then omits mint as a required signer.
  const mintSigner = generateSigner(umi);
  const builder = createNft(umi, {
    mint: mintSigner,
    name,
    symbol: GLEAN_BADGE_SYMBOL.slice(0, 10),
    uri: metadataUri,
    sellerFeeBasisPoints: percentAmount(0),
    tokenOwner: fromWeb3JsPublicKey(payer),
    isMutable: true,
  });

  const mintKeypair = Keypair.fromSecretKey(mintSigner.secretKey);
  const transaction = new Transaction({
    feePayer: payer,
    blockhash,
    lastValidBlockHeight,
  });
  for (const ix of builder.getInstructions()) {
    transaction.add(toWeb3JsInstruction(ix));
  }
  transaction.partialSign(mintKeypair);

  return { transaction, mint: toWeb3JsPublicKey(mintSigner.publicKey) };
}

/** Absolute Metaplex JSON URI for a wallet's fighter badge. */
export function getBadgeMetadataUri(origin: string, walletAddress: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/api/badge-metadata?wallet=${encodeURIComponent(walletAddress)}`;
}
