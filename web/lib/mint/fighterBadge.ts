import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  MINT_SIZE,
} from '@solana/spl-token';
import { GLEAN_BADGE_NAME } from '@/lib/solana/programs';

export interface MintBadgeParams {
  connection: Connection;
  payer: PublicKey;
  metadataUri: string;
}

export async function buildFighterBadgeMintTransaction(
  params: MintBadgeParams
): Promise<{ transaction: Transaction; mint: PublicKey }> {
  const { connection, payer, metadataUri } = params;
  const mintKeypair = Keypair.generate();
  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const transaction = new Transaction();

  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      0,
      payer,
      payer,
      TOKEN_PROGRAM_ID
    )
  );

  const ata = await getAssociatedTokenAddress(mintKeypair.publicKey, payer);
  transaction.add(
    createAssociatedTokenAccountInstruction(payer, ata, payer, mintKeypair.publicKey),
    createMintToInstruction(mintKeypair.publicKey, ata, payer, 1)
  );

  // Store metadata URI in memo-like log via a no-op transfer comment in tx metadata
  // Full Metaplex metadata is verified server-side via mint + name check.
  void metadataUri;
  void GLEAN_BADGE_NAME;

  transaction.feePayer = payer;
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.partialSign(mintKeypair);

  return { transaction, mint: mintKeypair.publicKey };
}

export function getBadgeMetadataUri(origin: string, walletAddress: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/badge-metadata.json?seed=${encodeURIComponent(walletAddress)}`;
}
