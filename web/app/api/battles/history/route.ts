import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import { getUserByTelegramIdFull } from '@/lib/wallet-wars/fighter.server';

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
    if (!user) return NextResponse.json({ battles: [] });

    const { data, error } = await supabase
      .from('battles')
      .select('id, opponent_type, bot_name, winner_id, points_awarded, status, created_at, completed_at')
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    const battles = (data ?? []).map((b) => ({
      id: b.id,
      opponentType: b.opponent_type,
      opponentName: b.bot_name ?? 'Player',
      won: b.winner_id === user.id,
      pointsAwarded: b.points_awarded,
      status: b.status,
      createdAt: b.created_at,
    }));

    return NextResponse.json({ battles });
  } catch (err) {
    console.error('[api/battles/history]', err);
    return NextResponse.json({ error: 'Could not load history.' }, { status: 500 });
  }
}
