import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  getActiveQuests,
  getUserByTelegramId,
  getCompletedQuestIds,
} from '@/lib/quests.server';
import { isAutoVerifiable } from '@/lib/solana/verify';

export const runtime = 'nodejs';

// GET /api/quests?telegramId=123
// Returns the active quest catalog with the user's completion status + points.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const telegramId = (searchParams.get('telegramId') || '').trim();

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('[api/quests] config error', err);
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const quests = await getActiveQuests(supabase);

    let completed = new Set<string>();
    let points = 0;
    let walletLinked = false;

    if (telegramId && /^\d+$/.test(telegramId)) {
      const user = await getUserByTelegramId(supabase, telegramId);
      if (user) {
        points = user.points;
        walletLinked = Boolean(user.wallet_address);
        completed = await getCompletedQuestIds(supabase, user.id);
      }
    }

    return NextResponse.json({
      points,
      walletLinked,
      quests: quests.map((q) => ({
        slug: q.slug,
        title: q.title,
        description: q.description,
        points: q.points,
        orderIndex: q.order_index,
        autoVerifiable: isAutoVerifiable(q.verification_type),
        completed: completed.has(q.id),
      })),
    });
  } catch (err) {
    console.error('[api/quests] error', err);
    return NextResponse.json(
      { error: 'Could not load quests.' },
      { status: 500 }
    );
  }
}
