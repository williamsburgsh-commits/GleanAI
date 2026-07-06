import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  getFighterByUserId,
  getUserByTelegramIdFull,
  awardBattlePoints,
  awardBattleQuests,
  getBattleDailyCount,
  getMaxBattlesPerDay,
} from '@/lib/wallet-wars/fighter.server';
import {
  resolveBattle,
  BATTLE_WIN_POINTS,
  BATTLE_LOSS_POINTS,
} from '@/lib/wallet-wars/battleResolver';
import { createBotFighter, fighterRowToSnapshot } from '@/lib/wallet-wars/botFactory';
import type { FighterSnapshot } from '@/lib/wallet-wars/battleResolver';

function toCardPayload(f: FighterSnapshot) {
  return {
    name: f.name,
    walletAddress: f.walletAddress,
    avatarUrl: f.avatarUrl,
    shield: f.stats.shield,
    power: f.stats.power,
    strike: f.stats.strike,
    agility: f.stats.agility,
    totalScore: f.totalScore,
    rarity: f.rarity,
    stats: f.stats,
  };
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { telegramId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
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

    const challengerCard = await getFighterByUserId(supabase, user.id);
    if (!challengerCard) {
      return NextResponse.json({ error: 'Scan your fighter first.' }, { status: 400 });
    }

    const daily = await getBattleDailyCount(supabase, user.id);
    if (daily >= getMaxBattlesPerDay()) {
      return NextResponse.json({ error: 'Daily battle limit reached.' }, { status: 429 });
    }

    const challenger = fighterRowToSnapshot(challengerCard);
    const score = challenger.totalScore;
    const minScore = Math.floor(score * 0.8);
    const maxScore = Math.ceil(score * 1.2);

    const { data: pool, error: poolErr } = await supabase
      .from('fighter_cards')
      .select('*')
      .neq('user_id', user.id)
      .gte('total_score', minScore)
      .lte('total_score', maxScore)
      .limit(20);
    if (poolErr) throw poolErr;

    let opponent;
    let opponentUserId: string | null = null;
    let matched = false;

    if (pool && pool.length > 0) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      opponentUserId = pick.user_id as string;
      const { data: oppUser } = await supabase
        .from('users')
        .select('telegram_username, wallet_address')
        .eq('id', opponentUserId)
        .maybeSingle();
      const name =
        (oppUser?.telegram_username as string | null) ??
        `${(pick.wallet_address as string).slice(0, 4)}…`;
      opponent = fighterRowToSnapshot(
        {
          id: pick.id as string,
          wallet_address: pick.wallet_address as string,
          shield: pick.shield as number,
          power: pick.power as number,
          strike: pick.strike as number,
          agility: pick.agility as number,
          total_score: pick.total_score as number,
          rarity: pick.rarity as string,
          avatar_url: pick.avatar_url as string,
        },
        name
      );
      matched = true;
    } else {
      opponent = createBotFighter(challenger.stats, challenger.totalScore, 'normal');
    }

    const resolution = resolveBattle(challenger, opponent);
    const challengerWon = resolution.winner === 'challenger';
    const pointsForChallenger = challengerWon ? BATTLE_WIN_POINTS : BATTLE_LOSS_POINTS;

    const { data: battle, error: battleErr } = await supabase
      .from('battles')
      .insert({
        challenger_id: user.id,
        opponent_id: opponentUserId,
        opponent_type: matched ? 'user' : 'bot',
        bot_seed: matched ? null : opponent.name,
        bot_name: matched ? null : opponent.name,
        winner_id: challengerWon ? user.id : opponentUserId,
        stat_results: resolution.rounds,
        points_awarded: pointsForChallenger,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (battleErr) throw battleErr;

    await awardBattlePoints(
      supabase,
      user.id,
      pointsForChallenger,
      challengerWon ? 'battle:win' : 'battle:loss',
      battle.id as string
    );
    await awardBattleQuests(supabase, user, challengerWon);

    return NextResponse.json({
      battleId: battle.id,
      matched,
      challenger: toCardPayload(challenger),
      opponent: toCardPayload(opponent),
      resolution,
      challengerWon,
      pointsAwarded: pointsForChallenger,
      decidingStat: resolution.decidingStat,
    });
  } catch (err) {
    console.error('[api/battles/match]', err);
    return NextResponse.json({ error: 'Matchmaking failed.' }, { status: 500 });
  }
}
