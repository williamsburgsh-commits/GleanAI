import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  getFighterByUserId,
  getUserByTelegramIdFull,
} from '@/lib/wallet-wars/fighter.server';
import { getGauntletProgress } from '@/lib/wallet-wars/bossGauntlet.server';

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
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    const fighter = await getFighterByUserId(supabase, user.id);
    const progress = await getGauntletProgress(supabase, user.id);

    return NextResponse.json({
      ...progress,
      hasFighter: Boolean(fighter),
      walletLinked: Boolean(user.wallet_address),
    });
  } catch (err) {
    console.error('[api/boss-gauntlet] GET', err);
    return NextResponse.json({ error: 'Failed to load gauntlet progress.' }, { status: 500 });
  }
}
