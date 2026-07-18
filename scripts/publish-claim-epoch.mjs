#!/usr/bin/env node
/**
 * Offline admin publish: snapshot epoch points → Merkle → claim_epochs/leaves.
 * Then optionally set_root on-chain (SET_ROOT=1).
 *
 * Usage:
 *   node scripts/publish-claim-epoch.mjs [epochSlug]
 *   SET_ROOT=1 node scripts/publish-claim-epoch.mjs 2026-W28
 *
 * Loads CLAIM_* + SUPABASE_* from web/.env.local
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { MerkleTree } from 'merkletreejs';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function loadEnvLocal() {
  const p = path.join(ROOT, 'web', '.env.local');
  const out = {};
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };
const mint = env.CLAIM_MINT || env.NEXT_PUBLIC_CLAIM_MINT;
const programIdStr = env.CLAIM_PROGRAM_ID || env.NEXT_PUBLIC_CLAIM_PROGRAM_ID;
const pointsToUnits = Math.max(1, Number(env.CLAIM_POINTS_TO_UNITS || '1000000') || 1_000_000);
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
// Prefer public Solana RPC for confirm (Alchemy often lacks signatureSubscribe).
const RPC =
  env.SOLANA_URL ||
  process.env.SOLANA_URL ||
  'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey(programIdStr || 'GmTBUan8sodfqKot1e266kAeVEcWyhGKDPNRfXCuW9ax');
const IX_SET_ROOT = Buffer.from('b7310acea8b78343', 'hex');

if (!mint) throw new Error('CLAIM_MINT missing in web/.env.local');
if (!supabaseUrl || !serviceKey) throw new Error('Supabase URL/service key missing');

function sha256(data) {
  return createHash('sha256').update(data).digest();
}

function leafHash(index, walletAddress, amount) {
  const idx = Buffer.alloc(8);
  idx.writeBigUInt64LE(BigInt(index));
  const claimant = Buffer.from(new PublicKey(walletAddress).toBytes());
  const amt = Buffer.alloc(8);
  amt.writeBigUInt64LE(BigInt(amount));
  return sha256(Buffer.concat([idx, claimant, amt]));
}

function buildClaimMerkle(entries) {
  const leaves = entries.map((e) => leafHash(e.index, e.walletAddress, e.amount));
  const tree = new MerkleTree(leaves, sha256, { sortPairs: true });
  const root = tree.getRoot().toString('hex');
  const proofs = leaves.map((leaf) =>
    tree.getProof(leaf).map((p) => p.data.toString('hex'))
  );
  return { root, proofs };
}

function mondayUtc(d) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function epochSlug(start) {
  const y = start.getUTCFullYear();
  const jan1 = new Date(Date.UTC(y, 0, 1));
  const week = Math.ceil(
    ((start.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7
  );
  return `${y}-W${String(week).padStart(2, '0')}`;
}

function previousWeekBounds() {
  const currentStart = mondayUtc(new Date());
  const prevEnd = new Date(currentStart);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - 7);
  return { startsAt: prevStart, endsAt: prevEnd, slug: epochSlug(prevStart) };
}

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

function distributorPda(mintPk) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('distributor'), mintPk.toBuffer()],
    PROGRAM_ID
  )[0];
}

async function setRootOnchain(rootHex) {
  const payer = loadKeypair();
  const mintPk = new PublicKey(mint);
  const distributor = distributorPda(mintPk);
  const rootBuf = Buffer.from(rootHex.replace(/^0x/i, ''), 'hex');
  if (rootBuf.length !== 32) throw new Error('bad root length');
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      { pubkey: distributor, isSigner: false, isWritable: true },
    ],
    data: Buffer.concat([IX_SET_ROOT, rootBuf]),
  });
  const connection = new Connection(RPC, 'confirmed');
  const sig = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(ix),
    [payer],
    { commitment: 'confirmed' }
  );
  return sig;
}

async function main() {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let slug = process.argv[2];
  let startsAt;
  let endsAt;
  if (slug) {
    const { data: ep, error } = await supabase
      .from('epochs')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!ep) throw new Error(`epoch not found: ${slug}`);
    startsAt = ep.starts_at;
    endsAt = ep.ends_at;
  } else {
    const prev = previousWeekBounds();
    slug = prev.slug;
    startsAt = prev.startsAt.toISOString();
    endsAt = prev.endsAt.toISOString();
  }

  console.log('epoch=', slug, startsAt, '→', endsAt);
  console.log('mint=', mint);
  console.log('pointsToUnits=', pointsToUnits);

  const { data: existing } = await supabase
    .from('claim_epochs')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (existing) {
    console.log('already published id=', existing.id, 'root=', existing.merkle_root);
    if (process.env.SET_ROOT === '1' && existing.status !== 'funded') {
      const sig = await setRootOnchain(existing.merkle_root);
      console.log('set_root sig=', sig);
      await supabase
        .from('claim_epochs')
        .update({ status: 'funded', onchain_tx: sig })
        .eq('id', existing.id);
      console.log('marked funded');
    }
    return;
  }

  // Ensure epochs row
  let { data: epochRow } = await supabase
    .from('epochs')
    .select('id, slug, starts_at, ends_at')
    .eq('slug', slug)
    .maybeSingle();
  if (!epochRow) {
    const { data: created, error: eErr } = await supabase
      .from('epochs')
      .insert({ slug, starts_at: startsAt, ends_at: endsAt })
      .select('id, slug, starts_at, ends_at')
      .single();
    if (eErr) throw eErr;
    epochRow = created;
  }

  const { data: ledger, error: ledgerErr } = await supabase
    .from('points_ledger')
    .select('user_id, amount')
    .gte('created_at', epochRow.starts_at)
    .lt('created_at', epochRow.ends_at);
  if (ledgerErr) throw ledgerErr;

  const totals = new Map();
  for (const row of ledger ?? []) {
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + Number(row.amount));
  }
  const positive = [...totals.entries()].filter(([, pts]) => pts > 0);
  if (positive.length === 0) throw new Error(`No claimable wallets for ${slug}`);

  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('id, wallet_address')
    .in(
      'id',
      positive.map(([id]) => id)
    )
    .not('wallet_address', 'is', null);
  if (usersErr) throw usersErr;

  const walletById = new Map(
    (users ?? [])
      .filter((u) => u.wallet_address)
      .map((u) => [u.id, String(u.wallet_address).trim()])
  );

  const snapshot = [];
  for (const [userId, points] of positive) {
    const wallet = walletById.get(userId);
    if (!wallet) continue;
    snapshot.push({ userId, walletAddress: wallet, points: Math.floor(points) });
  }
  snapshot.sort((a, b) => a.walletAddress.localeCompare(b.walletAddress));
  if (snapshot.length === 0) throw new Error('No wallets linked for positive ledgers');

  const entries = snapshot.map((s, index) => ({
    index,
    walletAddress: s.walletAddress,
    amount: BigInt(s.points) * BigInt(pointsToUnits),
    userId: s.userId,
    points: s.points,
  }));

  const { root, proofs } = buildClaimMerkle(
    entries.map((e) => ({
      index: e.index,
      walletAddress: e.walletAddress,
      amount: e.amount,
    }))
  );

  const totalPoints = entries.reduce((sum, e) => sum + e.points, 0);
  const totalUnits = entries.reduce((sum, e) => sum + e.amount, 0n);

  const { data: claimEpoch, error: insertErr } = await supabase
    .from('claim_epochs')
    .insert({
      epoch_id: epochRow.id,
      slug,
      merkle_root: root,
      mint,
      points_to_units: pointsToUnits,
      total_points: totalPoints,
      total_claim_units: totalUnits.toString(),
      leaf_count: entries.length,
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (insertErr) throw insertErr;

  const leafRows = entries.map((e, i) => ({
    claim_epoch_id: claimEpoch.id,
    user_id: e.userId,
    wallet_address: e.walletAddress,
    leaf_index: e.index,
    points: e.points,
    amount: e.amount.toString(),
    proof: proofs[i],
  }));
  const { error: leavesErr } = await supabase.from('claim_leaves').insert(leafRows);
  if (leavesErr) throw leavesErr;

  console.log('published id=', claimEpoch.id);
  console.log('root=', root);
  console.log('leaves=', entries.length, 'totalPoints=', totalPoints);
  for (const e of entries) {
    console.log(
      `  [${e.index}] ${e.walletAddress} pts=${e.points} amount=${e.amount.toString()}`
    );
  }

  if (process.env.SET_ROOT === '1') {
    const sig = await setRootOnchain(root);
    console.log('set_root sig=', sig);
    const { error: fundErr } = await supabase
      .from('claim_epochs')
      .update({ status: 'funded', onchain_tx: sig })
      .eq('id', claimEpoch.id);
    if (fundErr) throw fundErr;
    console.log('marked funded');
  } else {
    console.log('\nNext: SET_ROOT=1 node scripts/publish-claim-epoch.mjs', slug);
    console.log('  or: node scripts/set-root.mjs', root);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
