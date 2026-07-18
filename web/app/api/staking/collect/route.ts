import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import { getUserByTelegramIdFull, getFighterByUserId } from '@/lib/wallet-wars/fighter.server';
import { collectTraining, toTrainingStatus } from '@/lib/staking/staking.server';
import { isCurrentlyStaked } from '@/lib/staking/training';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/staking/collect { telegramId }
export async function POST(request: Request) {
  let body: { telegramId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ error: 'telegramId is required.' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    const user = await getUserByTelegramIdFull(supabase, telegramId);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const fighter = await getFighterByUserId(supabase, user.id);
    if (!fighter?.badge_mint) {
      return NextResponse.json({ error: 'No Fighter Badge linked.' }, { status: 400 });
    }
    if (!isCurrentlyStaked(fighter) && !fighter.badge_staked_at) {
      return NextResponse.json({ error: 'Stake your badge to train.' }, { status: 400 });
    }

    const result = await collectTraining(supabase, fighter);
    return NextResponse.json({
      ok: true,
      epochs: result.epochs,
      powerDelta: result.powerDelta,
      detail:
        result.epochs > 0
          ? `Collected ${result.epochs} epoch(s) (+${result.powerDelta} POWER).`
          : 'No pending training yet — keep the badge staked.',
      status: toTrainingStatus(result.fighter),
    });
  } catch (err) {
    console.error('[api/staking/collect]', err);
    return NextResponse.json({ error: 'Collect failed.' }, { status: 500 });
  }
}
