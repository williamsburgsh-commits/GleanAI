#!/usr/bin/env node
/**
 * Devnet: create test SPL mint (6 decimals), initialize glean-distributor,
 * mint supply into the vault PDA. Prints env lines for web/.env.local.
 *
 * Usage (from repo root, with web deps installed):
 *   node scripts/init-distributor.mjs
 *
 * Env overrides:
 *   SOLANA_URL (default https://api.devnet.solana.com)
 *   KEYPAIR (default ~/.config/solana/id.json)
 *   PROGRAM_ID (default GmTBUan8sodfqKot1e266kAeVEcWyhGKDPNRfXCuW9ax)
 *   MINT_AMOUNT (human tokens, default 1000000)
 *   EXISTING_MINT (skip create; only initialize+fund)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createInitializeMint2Instruction,
  createMintToInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || 'GmTBUan8sodfqKot1e266kAeVEcWyhGKDPNRfXCuW9ax'
);
const IX_INIT = Buffer.from('afaf6d1f0d989bed', 'hex');
const DECIMALS = 6;
const MINT_AMOUNT = BigInt(process.env.MINT_AMOUNT || '1000000'); // human units
const RPC = process.env.SOLANA_URL || 'https://api.devnet.solana.com';

function loadKeypair() {
  const p =
    process.env.KEYPAIR ||
    path.join(os.homedir(), '.config', 'solana', 'id.json');
  // WSL: also try Linux home if running under Windows node against WSL path
  const candidates = [
    p,
    '/home/choum/.config/solana/id.json',
    path.join('C:\\Users\\choum\\.config\\solana\\id.json'),
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        const secret = JSON.parse(fs.readFileSync(c, 'utf8'));
        return Keypair.fromSecretKey(Uint8Array.from(secret));
      }
    } catch {
      /* try next */
    }
  }
  throw new Error(`keypair not found (tried ${candidates.join(', ')})`);
}

function distributorPda(mint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('distributor'), mint.toBuffer()],
    PROGRAM_ID
  )[0];
}

function vaultPda(mint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), mint.toBuffer()],
    PROGRAM_ID
  )[0];
}

function buildInitializeIx(authority, mint) {
  const distributor = distributorPda(mint);
  const vault = vaultPda(mint);
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: distributor, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: IX_INIT,
  });
}

async function main() {
  const payer = loadKeypair();
  const connection = new Connection(RPC, 'confirmed');
  console.log('rpc=', RPC);
  console.log('authority=', payer.publicKey.toBase58());
  console.log('program=', PROGRAM_ID.toBase58());
  console.log('balance=', (await connection.getBalance(payer.publicKey)) / 1e9, 'SOL');

  let mintPk;
  if (process.env.EXISTING_MINT) {
    mintPk = new PublicKey(process.env.EXISTING_MINT);
    console.log('using EXISTING_MINT=', mintPk.toBase58());
  } else {
    const mint = Keypair.generate();
    mintPk = mint.publicKey;
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const tx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMint2Instruction(
        mint.publicKey,
        DECIMALS,
        payer.publicKey,
        null,
        TOKEN_PROGRAM_ID
      )
    );
    const sig = await sendAndConfirmTransaction(connection, tx, [payer, mint], {
      commitment: 'confirmed',
    });
    console.log('mint created=', mintPk.toBase58(), 'sig=', sig);
  }

  const distributor = distributorPda(mintPk);
  const vault = vaultPda(mintPk);
  console.log('distributor=', distributor.toBase58());
  console.log('vault=', vault.toBase58());

  const distInfo = await connection.getAccountInfo(distributor);
  if (!distInfo) {
    const initTx = new Transaction().add(
      buildInitializeIx(payer.publicKey, mintPk)
    );
    const sig = await sendAndConfirmTransaction(connection, initTx, [payer], {
      commitment: 'confirmed',
    });
    console.log('initialize ok sig=', sig);
  } else {
    console.log('distributor already initialized — skipping initialize');
  }

  const rawAmount = MINT_AMOUNT * 10n ** BigInt(DECIMALS);
  const mintTx = new Transaction().add(
    createMintToInstruction(
      mintPk,
      vault,
      payer.publicKey,
      rawAmount,
      [],
      TOKEN_PROGRAM_ID
    )
  );
  const mintSig = await sendAndConfirmTransaction(connection, mintTx, [payer], {
    commitment: 'confirmed',
  });
  console.log('minted', MINT_AMOUNT.toString(), 'tokens to vault; sig=', mintSig);

  const bal = await connection.getTokenAccountBalance(vault);
  console.log('vault balance=', bal.value.uiAmountString);

  const envBlock = [
    `CLAIM_MINT=${mintPk.toBase58()}`,
    `NEXT_PUBLIC_CLAIM_MINT=${mintPk.toBase58()}`,
    `CLAIM_PROGRAM_ID=${PROGRAM_ID.toBase58()}`,
    `NEXT_PUBLIC_CLAIM_PROGRAM_ID=${PROGRAM_ID.toBase58()}`,
    `CLAIM_POINTS_TO_UNITS=1000000`,
    `CLAIM_AUTHORITY=${payer.publicKey.toBase58()}`,
  ].join('\n');

  const outPath = path.join(__dirname, '..', '.claim-env.local');
  fs.writeFileSync(outPath, envBlock + '\n', 'utf8');
  console.log('\n--- paste into web/.env.local ---\n' + envBlock);
  console.log('\nwrote', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
