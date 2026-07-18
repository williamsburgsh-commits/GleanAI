import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getServiceClient } from '@/lib/supabaseServer';
import { getUserByTelegramIdFull } from '@/lib/wallet-wars/fighter.server';
import { getQuestBySlug, recordCompletion } from '@/lib/quests.server';
import { getConnection } from '@/lib/solana/connection';
import { TOKEN_METADATA_PROGRAM_ID } from '@/lib/solana/programs';

export const runtime = 'nodejs';

function txTouchesTokenMetadata(tx: {
  transaction: { message: { accountKeys: Array<{ pubkey: PublicKey } | PublicKey> } };
  meta?: { innerInstructions?: Array<{ instructions: Array<{ programId?: PublicKey }> }> | null };
}): boolean {
  const keys = tx.transaction.message.accountKeys.map((k) =>
    typeof (k as { pubkey?: PublicKey }).pubkey !== 'undefined'
      ? (k as { pubkey: PublicKey }).pubkey.toBase58()
      : (k as PublicKey).toBase58()
  );
  if (keys.includes(TOKEN_METADATA_PROGRAM_ID)) return true;

  for (const inner of tx.meta?.innerInstructions ?? []) {
    for (const ix of inner.instructions) {
      if (ix.programId?.toBase58() === TOKEN_METADATA_PROGRAM_ID) return true;
    }
  }
  return false;
}

export async function POST(request: Request) {
  let body: { telegramId?: string; txSignature?: string; mintAddress?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  const txSignature = (body.txSignature || '').toString().trim();
  const mintAddress = (body.mintAddress || '').toString().trim();

  if (!telegramId || !txSignature) {
    return NextResponse.json({ error: 'telegramId and txSignature required.' }, { status: 400 });
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

    const conn = getConnection();
    const tx = await conn.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
    });
    if (!tx || tx.meta?.err) {
      return NextResponse.json({ error: 'Mint transaction not verified.' }, { status: 400 });
    }

    if (!txTouchesTokenMetadata(tx as never)) {
      return NextResponse.json(
        { error: 'Transaction is not a Metaplex Token Metadata mint.' },
        { status: 400 }
      );
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
      detail: awarded ? 'Fighter Badge NFT mint verified!' : 'Already minted.',
    });
  } catch (err) {
    console.error('[api/mint/fighter-badge]', err);
    return NextResponse.json({ error: 'Mint verification failed.' }, { status: 500 });
  }
}
