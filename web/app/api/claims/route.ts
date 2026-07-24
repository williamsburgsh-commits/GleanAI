import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import { getClaimForTelegramUser } from '@/lib/claims/publish.server';

export const runtime = 'nodejs';

// GET /api/claims?telegramId=
export async function GET(request: Request) {
  const telegramId = new URL(request.url).searchParams.get('telegramId')?.trim() ?? '';
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ error: 'A valid telegramId is required.' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    const info = await getClaimForTelegramUser(supabase, telegramId);
    if (!info) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      epoch: info.epoch
        ? {
            id: info.epoch.id,
            slug: info.epoch.slug,
            merkleRoot: info.epoch.merkle_root,
            mint: info.epoch.mint,
            pointsToUnits: info.epoch.points_to_units,
            status: info.epoch.status,
            publishedAt: info.epoch.published_at,
          }
        : null,
      pendingEpoch: info.pendingEpoch
        ? {
            id: info.pendingEpoch.id,
            slug: info.pendingEpoch.slug,
            status: info.pendingEpoch.status,
            publishedAt: info.pendingEpoch.published_at,
          }
        : null,
      leaf: info.leaf,
      config: {
        mint: info.config.mint || null,
        programId: info.config.programId || null,
        pointsToUnits: info.config.pointsToUnits,
        claimsReady: info.config.claimsReady,
        badgeStaked: info.config.badgeStaked,
        stakingRequired: info.config.stakingRequired,
        epochFunded: info.config.epochFunded,
      },
    });
  } catch (err) {
    console.error('[api/claims] error', err);
    return NextResponse.json({ error: 'Could not load claim info.' }, { status: 500 });
  }
}
