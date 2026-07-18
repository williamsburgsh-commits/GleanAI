#!/usr/bin/env node
/**
 * Authority signs set_root for the distributor PDA.
 *
 * Usage:
 *   node scripts/set-root.mjs <merkle_root_hex> [mint]
 *
 * Defaults mint from CLAIM_MINT / .claim-env.local / EXISTING_MINT.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || 'GmTBUan8sodfqKot1e266kAeVEcWyhGKDPNRfXCuW9ax'
);
const IX_SET_ROOT = Buffer.from('b7310acea8b78343', 'hex');
// Public RPC — Alchemy HTTP endpoints often lack signatureSubscribe websockets.
const RPC = process.env.SOLANA_URL || 'https://api.devnet.solana.com';

function loadKeypair() {
  const p =
    process.env.KEYPAIR ||
    path.join(os.homedir(), '.config', 'solana', 'id.json');
  const candidates = [
    p,
    '/home/choum/.config/solana/id.json',
    path.join('C:\\Users\\choum\\.config\\solana\\id.json'),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        return Keypair.fromSecretKey(
          Uint8Array.from(JSON.parse(fs.readFileSync(c, 'utf8')))
        );
      }
    } catch {
      /* next */
    }
  }
  throw new Error('keypair not found');
}

function resolveMint() {
  if (process.argv[3]) return process.argv[3];
  if (process.env.CLAIM_MINT) return process.env.CLAIM_MINT;
  if (process.env.EXISTING_MINT) return process.env.EXISTING_MINT;
  const envFile = path.join(__dirname, '..', '.claim-env.local');
  if (fs.existsSync(envFile)) {
    const m = fs.readFileSync(envFile, 'utf8').match(/^CLAIM_MINT=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error('mint required: pass as arg2 or set CLAIM_MINT');
}

function distributorPda(mint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('distributor'), mint.toBuffer()],
    PROGRAM_ID
  )[0];
}

async function main() {
  const rootArg = process.argv[2];
  if (!rootArg) {
    console.error('usage: node scripts/set-root.mjs <merkle_root_hex> [mint]');
    process.exit(1);
  }
  const clean = rootArg.replace(/^0x/i, '');
  const rootBuf = Buffer.from(clean, 'hex');
  if (rootBuf.length !== 32) {
    throw new Error(`root must be 32 bytes hex (got ${rootBuf.length})`);
  }

  const payer = loadKeypair();
  const mint = new PublicKey(resolveMint());
  const distributor = distributorPda(mint);
  const connection = new Connection(RPC, 'confirmed');

  const data = Buffer.concat([IX_SET_ROOT, rootBuf]);
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: distributor, isSigner: false, isWritable: true },
    ],
    data,
  });

  console.log('authority=', payer.publicKey.toBase58());
  console.log('mint=', mint.toBase58());
  console.log('distributor=', distributor.toBase58());
  console.log('root=', clean);

  const sig = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(ix),
    [payer],
    { commitment: 'confirmed' }
  );
  console.log('set_root ok sig=', sig);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
