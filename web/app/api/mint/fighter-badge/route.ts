import { NextResponse } from 'next/server';
import { PublicKey, type ParsedTransactionWithMeta } from '@solana/web3.js';
import { getServiceClient } from '@/lib/supabaseServer';
import { getUserByTelegramIdFull } from '@/lib/wallet-wars/fighter.server';
import { getQuestBySlug, recordCompletion } from '@/lib/quests.server';
import { getConnection } from '@/lib/solana/connection';
import { TOKEN_METADATA_PROGRAM_ID } from '@/lib/solana/programs';
import { verifyGleanFighterBadge } from '@/lib/solana/verifiers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function accountKeyBase58(k: { pubkey: PublicKey } | PublicKey): string {
  if (k && typeof k === 'object' && 'pubkey' in k && k.pubkey) {
    return k.pubkey.toBase58();
  }
  return (k as PublicKey).toBase58();
}

function txTouchesTokenMetadata(tx: ParsedTransactionWithMeta): boolean {
  const keys = tx.transaction.message.accountKeys.map(accountKeyBase58);
  if (keys.includes(TOKEN_METADATA_PROGRAM_ID)) return true;

  for (const inner of tx.meta?.innerInstructions ?? []) {
    for (const ix of inner.instructions) {
      const pid = 'programId' in ix && ix.programId ? ix.programId.toBase58() : '';
      if (pid === TOKEN_METADATA_PROGRAM_ID) return true;
    }
  }
  return false;
}

/** Prefer the 1-of-1 token balance minted to the wallet. */
function extractMintAddress(
  tx: ParsedTransactionWithMeta,
  ownerWallet: string
): string | null {
  const posts = tx.meta?.postTokenBalances ?? [];
  for (const b of posts) {
    if (
      b.owner === ownerWallet &&
      b.mint &&
      (b.uiTokenAmount?.amount === '1' || b.uiTokenAmount?.uiAmount === 1)
    ) {
      return b.mint;
    }
  }
  for (const b of posts) {
    if (b.owner === ownerWallet && b.mint) return b.mint;
  }
  return null;
}

async function fetchMintTx(
  signature: string,
  attempts = 5
): Promise<ParsedTransactionWithMeta | null> {
  const conn = getConnection();
  for (let i = 0; i < attempts; i += 1) {
    if (i > 0) await sleep(1500 * i);
    const tx = await conn.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });
    if (tx && !tx.meta?.err) return tx;
  }
  return null;
}

export async function POST(request: Request) {
  let body: {
    telegramId?: string;
    txSignature?: string;
    mintAddress?: string;
    /** Re-scan wallet history when confirm/verify timed out after a successful mint. */
    sync?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  let txSignature = (body.txSignature || '').toString().trim();
  let mintAddress = (body.mintAddress || '').toString().trim();
  const sync = Boolean(body.sync);

  if (!telegramId) {
    return NextResponse.json({ error: 'telegramId required.' }, { status: 400 });
  }
  if (!txSignature && !sync) {
    return NextResponse.json(
      { error: 'txSignature required (or set sync: true).' },
      { status: 400 }
    );
  }

  if (mintAddress) {
    try {
      // eslint-disable-next-line no-new
      new PublicKey(mintAddress);
    } catch {
      return NextResponse.json({ error: 'Invalid mintAddress.' }, { status: 400 });
    }
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch {
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const user = await getUserByTelegramIdFull(supabase, telegramId);
    if (!user?.wallet_address) {
      return NextResponse.json({ error: 'Wallet not linked.' }, { status: 400 });
    }

    if (sync && !txSignature) {
      const detected = await verifyGleanFighterBadge(user.wallet_address);
      if (!detected.passed || !detected.txSignature) {
        return NextResponse.json(
          { error: detected.detail || 'No Fighter Badge mint found for this wallet.' },
          { status: 400 }
        );
      }
      txSignature = detected.txSignature;
    }

    const tx = await fetchMintTx(txSignature);
    if (!tx || tx.meta?.err) {
      return NextResponse.json(
        {
          error:
            'Mint transaction not found yet. Wait a few seconds and tap Sync, or retry.',
        },
        { status: 400 }
      );
    }

    if (!txTouchesTokenMetadata(tx)) {
      return NextResponse.json(
        { error: 'Transaction is not a Metaplex Token Metadata mint.' },
        { status: 400 }
      );
    }

    if (!mintAddress) {
      mintAddress = extractMintAddress(tx, user.wallet_address) || '';
    }

    const quest = await getQuestBySlug(supabase, 'mint-fighter-badge');
    if (!quest) {
      return NextResponse.json({ error: 'Quest not found.' }, { status: 404 });
    }

    const { awarded } = await recordCompletion(supabase, {
      user,
      quest,
      txSignature,
    });

    if (mintAddress) {
      const { error: updateErr } = await supabase
        .from('fighter_cards')
        .update({ badge_mint: mintAddress })
        .eq('user_id', user.id)
        .is('badge_mint', null);
      if (updateErr) {
        console.warn('[api/mint/fighter-badge] badge_mint update', updateErr.message);
      }
    }

    return NextResponse.json({
      awarded,
      pointsAwarded: awarded ? quest.points : 0,
      mintAddress: mintAddress || null,
      txSignature,
      detail: awarded
        ? 'Fighter Badge NFT mint verified!'
        : mintAddress
          ? 'Badge already linked.'
          : 'Already minted.',
    });
  } catch (err) {
    console.error('[api/mint/fighter-badge]', err);
    return NextResponse.json({ error: 'Mint verification failed.' }, { status: 500 });
  }
}
