import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import { getUserByTelegramIdFull, getFighterByUserId } from '@/lib/wallet-wars/fighter.server';
import { toTrainingStatus } from '@/lib/staking/staking.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/staking/status?telegramId=
export async function GET(request: Request) {
  const telegramId = new URL(request.url).searchParams.get('telegramId')?.trim() ?? '';
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
    return NextResponse.json({
      walletLinked: Boolean(user.wallet_address),
      status: toTrainingStatus(fighter),
    });
  } catch (err) {
    console.error('[api/staking/status]', err);
    return NextResponse.json({ error: 'Could not load staking status.' }, { status: 500 });
  }
}
