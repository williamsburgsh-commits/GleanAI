import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

/** Anchor sighash first 8 bytes of sha256("global:<name>") — precomputed. */
const IX = {
  initialize: Buffer.from('afaf6d1f0d989bed', 'hex'),
  set_root: Buffer.from('b7310acea8b78343', 'hex'),
  claim: Buffer.from('3ec6d6c1d59f6cd2', 'hex'),
} as const;

/** Client-safe claim program config helpers (no server secrets). */
export function getPublicClaimConfig() {
  const mint = process.env.NEXT_PUBLIC_CLAIM_MINT?.trim() || '';
  const programId = process.env.NEXT_PUBLIC_CLAIM_PROGRAM_ID?.trim() || '';
  return { mint, programId };
}

export function isClaimsConfigured(programId?: string | null, mint?: string | null): boolean {
  const cfg = getPublicClaimConfig();
  const p = programId ?? cfg.programId;
  const m = mint ?? cfg.mint;
  if (!p || !m) return false;
  try {
    // eslint-disable-next-line no-new
    new PublicKey(p);
    // eslint-disable-next-line no-new
    new PublicKey(m);
    return true;
  } catch {
    return false;
  }
}

export function distributorPda(programId: PublicKey, mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('distributor'), mint.toBuffer()],
    programId
  );
  return pda;
}

export function vaultPda(programId: PublicKey, mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), mint.toBuffer()],
    programId
  );
  return pda;
}

export function claimStatusPda(
  programId: PublicKey,
  distributor: PublicKey,
  index: number
): PublicKey {
  const idx = Buffer.alloc(8);
  idx.writeBigUInt64LE(BigInt(index));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('claimed'), distributor.toBuffer(), idx],
    programId
  );
  return pda;
}

function encodeU64(n: number | bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}

function encodeRootHex(rootHex: string): Buffer {
  const clean = rootHex.replace(/^0x/i, '');
  const buf = Buffer.from(clean, 'hex');
  if (buf.length !== 32) throw new Error('merkle root must be 32 bytes hex');
  return buf;
}

export function buildInitializeIx(params: {
  programId: PublicKey;
  authority: PublicKey;
  mint: PublicKey;
}): TransactionInstruction {
  const distributor = distributorPda(params.programId, params.mint);
  const vault = vaultPda(params.programId, params.mint);
  return new TransactionInstruction({
    programId: params.programId,
    keys: [
      { pubkey: params.authority, isSigner: true, isWritable: true },
      { pubkey: params.mint, isSigner: false, isWritable: false },
      { pubkey: distributor, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(IX.initialize),
  });
}

export function buildSetRootIx(params: {
  programId: PublicKey;
  authority: PublicKey;
  mint: PublicKey;
  rootHex: string;
}): TransactionInstruction {
  const distributor = distributorPda(params.programId, params.mint);
  const data = Buffer.concat([Buffer.from(IX.set_root), encodeRootHex(params.rootHex)]);
  return new TransactionInstruction({
    programId: params.programId,
    keys: [
      { pubkey: params.authority, isSigner: true, isWritable: false },
      { pubkey: distributor, isSigner: false, isWritable: true },
    ],
    data,
  });
}

export function buildClaimIx(params: {
  programId: PublicKey;
  mint: PublicKey;
  claimant: PublicKey;
  index: number;
  amount: bigint;
  /** Sibling hashes as hex strings (sorted-pair tree). */
  proof: string[];
}): TransactionInstruction {
  const distributor = distributorPda(params.programId, params.mint);
  const vault = vaultPda(params.programId, params.mint);
  const claimStatus = claimStatusPda(params.programId, distributor, params.index);
  const claimantAta = getAssociatedTokenAddressSync(params.mint, params.claimant);

  const proofBufs = params.proof.map((h) => {
    const b = Buffer.from(h.replace(/^0x/i, ''), 'hex');
    if (b.length !== 32) throw new Error('proof node must be 32 bytes');
    return b;
  });

  const proofLen = Buffer.alloc(4);
  proofLen.writeUInt32LE(proofBufs.length);
  const data = Buffer.concat([
    Buffer.from(IX.claim),
    encodeU64(params.index),
    encodeU64(params.amount),
    proofLen,
    ...proofBufs,
  ]);

  return new TransactionInstruction({
    programId: params.programId,
    keys: [
      { pubkey: params.claimant, isSigner: true, isWritable: true },
      { pubkey: distributor, isSigner: false, isWritable: false },
      { pubkey: params.mint, isSigner: false, isWritable: false },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: claimantAta, isSigner: false, isWritable: true },
      { pubkey: claimStatus, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}
