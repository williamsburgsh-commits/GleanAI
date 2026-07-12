import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  getAllTimeLeaderboard,
  getAllTimeRank,
  getEpochLeaderboard,
  getEpochRank,
} from '@/lib/points/leaderboard.server';
import { LEADERBOARD_MINI_TOP_N, LEADERBOARD_MIN_POINTS } from '@/lib/points/rules';

export const runtime = 'nodejs';

// GET /api/leaderboard?telegramId=123&mode=alltime|epoch&limit=50
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const telegramId = (searchParams.get('telegramId') || '').trim();
  const mode = (searchParams.get('mode') || 'alltime').toLowerCase();
  const limitRaw = Number(searchParams.get('limit') || LEADERBOARD_MINI_TOP_N);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : LEADERBOARD_MINI_TOP_N;

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('[api/leaderboard] config error', err);
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    if (searchParams.get('mode') === 'fighter') {
      const { data: cards, error } = await supabase
        .from('fighter_cards')
        .select('user_id, total_score')
        .order('total_score', { ascending: false })
        .limit(limit);
      if (error) throw error;

      const top = [];
      for (let i = 0; i < (cards ?? []).length; i += 1) {
        const card = cards![i];
        const { data: u } = await supabase
          .from('users')
          .select('telegram_id, telegram_username')
          .eq('id', card.user_id as string)
          .maybeSingle();
        top.push({
          rank: i + 1,
          telegramId: u ? String(u.telegram_id) : '',
          username: (u?.telegram_username as string | null) ?? null,
          points: card.total_score as number,
          fighterScore: card.total_score as number,
        });
      }

      let myRank: number | null = null;
      let myPoints = 0;
      if (telegramId && /^\d+$/.test(telegramId)) {
        const { data: me } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', telegramId)
          .maybeSingle();
        if (me) {
          const { data: card } = await supabase
            .from('fighter_cards')
            .select('total_score')
            .eq('user_id', me.id)
            .maybeSingle();
          if (card) {
            myPoints = card.total_score as number;
            const { count } = await supabase
              .from('fighter_cards')
              .select('id', { count: 'exact', head: true })
              .gt('total_score', myPoints);
            myRank = (count ?? 0) + 1;
          }
        }
      }

      return NextResponse.json({ top, myRank, myPoints, mode: 'fighter' });
    }

    if (mode === 'epoch') {
      const { epoch, top } = await getEpochLeaderboard(supabase, limit);
      let myRank: number | null = null;
      let myPoints = 0;
      if (telegramId && /^\d+$/.test(telegramId)) {
        const rank = await getEpochRank(supabase, telegramId);
        myRank = rank.myRank;
        myPoints = rank.myPoints;
      }
      return NextResponse.json({
        top,
        myRank,
        myPoints,
        mode: 'epoch',
        epoch: {
          slug: epoch.slug,
          startsAt: epoch.starts_at,
          endsAt: epoch.ends_at,
        },
        minPoints: LEADERBOARD_MIN_POINTS,
      });
    }

    const top = await getAllTimeLeaderboard(supabase, limit);
    let myRank: number | null = null;
    let myPoints = 0;
    if (telegramId && /^\d+$/.test(telegramId)) {
      const rank = await getAllTimeRank(supabase, telegramId);
      myRank = rank.myRank;
      myPoints = rank.myPoints;
    }

    return NextResponse.json({
      top,
      myRank,
      myPoints,
      mode: 'alltime',
      minPoints: LEADERBOARD_MIN_POINTS,
    });
  } catch (err) {
    console.error('[api/leaderboard] error', err);
    return NextResponse.json(
      { error: 'Could not load leaderboard.' },
      { status: 500 }
    );
  }
}
