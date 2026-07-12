import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import { getUserByTelegramId } from '@/lib/quests.server';
import { getOrCreateCurrentEpoch } from '@/lib/points/epochs.server';
import { getPointsBreakdown } from '@/lib/points/leaderboard.server';

export const runtime = 'nodejs';

// GET /api/points/summary?telegramId=123
export async function GET(request: Request) {
  const telegramId = new URL(request.url).searchParams.get('telegramId')?.trim() ?? '';
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ error: 'A valid telegramId is required.' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('[api/points/summary] config error', err);
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const user = await getUserByTelegramId(supabase, telegramId);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const epoch = await getOrCreateCurrentEpoch(supabase);
    const breakdown = await getPointsBreakdown(
      supabase,
      user.id,
      epoch.starts_at,
      epoch.ends_at
    );

    return NextResponse.json({
      walletLinked: Boolean(user.wallet_address),
      epoch: {
        slug: epoch.slug,
        startsAt: epoch.starts_at,
        endsAt: epoch.ends_at,
      },
      ...breakdown,
    });
  } catch (err) {
    console.error('[api/points/summary] error', err);
    return NextResponse.json({ error: 'Could not load points summary.' }, { status: 500 });
  }
}
