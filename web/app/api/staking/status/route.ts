import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getServiceClient } from '@/lib/supabaseServer';
import { getUserByTelegramIdFull, getFighterByUserId } from '@/lib/wallet-wars/fighter.server';
import { getConnection } from '@/lib/solana/connection';
import { normalizeCluster } from '@/lib/solana/cluster';
import {
  reconcileStakeWithChain,
  toTrainingStatus,
} from '@/lib/staking/staking.server';

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

    if (fighter?.badge_mint && user.wallet_address) {
      const cluster = normalizeCluster(process.env.SOLANA_CLUSTER);
      const conn = getConnection({ cluster });
      const { status } = await reconcileStakeWithChain({
        supabase,
        fighter,
        connection: conn,
        owner: new PublicKey(user.wallet_address),
      });
      return NextResponse.json({
        walletLinked: true,
        status,
      });
    }

    return NextResponse.json({
      walletLinked: Boolean(user.wallet_address),
      status: toTrainingStatus(fighter),
    });
  } catch (err) {
    console.error('[api/staking/status]', err);
    const message =
      err instanceof Error ? err.message : 'Could not load staking status.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
