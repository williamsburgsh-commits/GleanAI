import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import { getUserByTelegramIdFull } from '@/lib/wallet-wars/fighter.server';
import { getQuestBySlug, recordCompletion } from '@/lib/quests.server';
import { getConnection } from '@/lib/solana/connection';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { telegramId?: string; txSignature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  const txSignature = (body.txSignature || '').toString().trim();

  if (!telegramId || !txSignature) {
    return NextResponse.json({ error: 'telegramId and txSignature required.' }, { status: 400 });
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

    const quest = await getQuestBySlug(supabase, 'mint-fighter-badge');
    if (!quest) {
      return NextResponse.json({ error: 'Quest not found.' }, { status: 404 });
    }

    const { awarded } = await recordCompletion(supabase, {
      user,
      quest,
      txSignature,
    });

    return NextResponse.json({
      awarded,
      pointsAwarded: awarded ? quest.points : 0,
      detail: awarded ? 'Fighter Badge mint verified!' : 'Already minted.',
    });
  } catch (err) {
    console.error('[api/mint/fighter-badge]', err);
    return NextResponse.json({ error: 'Mint verification failed.' }, { status: 500 });
  }
}
