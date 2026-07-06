import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  getUserByTelegramIdFull,
  scanAndUpsertFighter,
} from '@/lib/wallet-wars/fighter.server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { telegramId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ error: 'telegramId is required.' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch {
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const user = await getUserByTelegramIdFull(supabase, telegramId);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    if (!user.wallet_address) {
      return NextResponse.json({ error: 'Link a wallet before scanning.' }, { status: 400 });
    }

    const { fighter, isFirstScan } = await scanAndUpsertFighter(supabase, user);

    return NextResponse.json({
      isFirstScan,
      fighter: {
        name: `${fighter.wallet_address.slice(0, 4)}…${fighter.wallet_address.slice(-4)}`,
        walletAddress: fighter.wallet_address,
        avatarUrl: fighter.avatar_url,
        strike: fighter.strike,
        shield: fighter.shield,
        power: fighter.power,
        armor: fighter.armor,
        agility: fighter.agility,
        totalScore: fighter.total_score,
        rarity: fighter.rarity,
        questBonus: fighter.quest_bonus,
        scannedAt: fighter.scanned_at,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Scan failed.';
    if (msg.includes('Rescan available')) {
      return NextResponse.json({ error: msg }, { status: 429 });
    }
    console.error('[api/fighter/scan]', err);
    return NextResponse.json({ error: 'Wallet scan failed. Try again.' }, { status: 502 });
  }
}
