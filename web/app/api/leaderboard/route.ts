import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

const TOP_N = 10;

// GET /api/leaderboard?telegramId=123
// Returns the top players by points, plus the caller's rank (if provided).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const telegramId = (searchParams.get('telegramId') || '').trim();

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('[api/leaderboard] config error', err);
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const mode = searchParams.get('mode');
    if (mode === 'fighter') {
      const { data: cards, error } = await supabase
        .from('fighter_cards')
        .select('user_id, total_score')
        .order('total_score', { ascending: false })
        .limit(TOP_N);
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

    const { data, error } = await supabase
      .from('users')
      .select('telegram_id, telegram_username, points')
      .order('points', { ascending: false })
      .limit(TOP_N);
    if (error) throw error;

    const top = (data ?? []).map((u, i) => ({
      rank: i + 1,
      telegramId: String(u.telegram_id),
      username: u.telegram_username as string | null,
      points: u.points as number,
    }));

    let myRank: number | null = null;
    let myPoints = 0;
    if (telegramId && /^\d+$/.test(telegramId)) {
      const { data: me, error: meErr } = await supabase
        .from('users')
        .select('points')
        .eq('telegram_id', telegramId)
        .maybeSingle();
      if (meErr) throw meErr;
      if (me) {
        myPoints = me.points as number;
        const { count, error: cntErr } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .gt('points', myPoints);
        if (cntErr) throw cntErr;
        myRank = (count ?? 0) + 1;
      }
    }

    return NextResponse.json({ top, myRank, myPoints });
  } catch (err) {
    console.error('[api/leaderboard] error', err);
    return NextResponse.json(
      { error: 'Could not load leaderboard.' },
      { status: 500 }
    );
  }
}
