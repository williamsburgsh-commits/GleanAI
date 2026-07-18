import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  getFighterByUserId,
  getUserByTelegramIdFull,
  canRescan,
} from '@/lib/wallet-wars/fighter.server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const telegramId = (searchParams.get('telegramId') || '').trim();

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

    const fighter = await getFighterByUserId(supabase, user.id);
    if (!fighter) {
      return NextResponse.json({ fighter: null, walletLinked: Boolean(user.wallet_address) });
    }

    const cooldown = canRescan(fighter.scanned_at);

    return NextResponse.json({
      walletLinked: Boolean(user.wallet_address),
      fighter: {
        name: shorten(fighter.wallet_address),
        walletAddress: fighter.wallet_address,
        avatarUrl: fighter.avatar_url,
        strike: fighter.strike,
        shield: fighter.shield,
        power: fighter.power,
        armor: fighter.armor ?? 0,
        agility: fighter.agility,
        totalScore: fighter.total_score,
        rarity: fighter.rarity,
        questBonus: fighter.quest_bonus,
        scannedAt: fighter.scanned_at,
        badgeMint: fighter.badge_mint ?? null,
        canRescan: cooldown.allowed,
        nextRescanAt: cooldown.nextAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    console.error('[api/fighter] GET', err);
    return NextResponse.json({ error: 'Could not load fighter.' }, { status: 500 });
  }
}

function shorten(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
