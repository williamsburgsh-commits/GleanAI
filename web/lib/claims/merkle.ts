import { createHash } from 'crypto';
import { PublicKey } from '@solana/web3.js';
import { MerkleTree } from 'merkletreejs';

export function u64Le(n: number | bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}

/** Leaf: sha256(index_u64_le || claimant_32 || amount_u64_le) */
export function hashClaimLeaf(index: number, walletAddress: string, amount: bigint): Buffer {
  const claimant = new PublicKey(walletAddress).toBuffer();
  return createHash('sha256')
    .update(Buffer.concat([u64Le(index), claimant, u64Le(amount)]))
    .digest();
}

function sha256Buf(data: Buffer | string): Buffer {
  const input = typeof data === 'string' ? Buffer.from(data, 'hex') : data;
  return createHash('sha256').update(input).digest();
}

export interface BuiltMerkle {
  root: string; // 32-byte hex
  leaves: Buffer[];
  /** proof[i] = sibling hashes as hex strings, bottom → top */
  proofs: string[][];
}

export function buildClaimMerkle(
  entries: Array<{ index: number; walletAddress: string; amount: bigint }>
): BuiltMerkle {
  if (entries.length === 0) {
    throw new Error('Cannot build Merkle tree with zero leaves.');
  }

  const leaves = entries.map((e) => hashClaimLeaf(e.index, e.walletAddress, e.amount));
  const tree = new MerkleTree(leaves, sha256Buf, { sortPairs: true });
  const root = tree.getRoot().toString('hex');
  const proofs = leaves.map((leaf) =>
    tree.getProof(leaf).map((p) => p.data.toString('hex'))
  );

  return { root, leaves, proofs };
}

export function verifyClaimProof(
  index: number,
  walletAddress: string,
  amount: bigint,
  proof: string[],
  rootHex: string
): boolean {
  const leaf = hashClaimLeaf(index, walletAddress, amount);
  const tree = new MerkleTree([leaf], sha256Buf, { sortPairs: true });
  return tree.verify(
    proof.map((h) => Buffer.from(h, 'hex')),
    leaf,
    Buffer.from(rootHex, 'hex')
  );
}
