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
  type FighterSnapshot,
} from '@/lib/wallet-wars/battleResolver';
import {
  createBotFighter,
  fighterRowToSnapshot,
  type BotDifficulty,
} from '@/lib/wallet-wars/botFactory';

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

interface BattleBody {
  telegramId?: string;
  opponentType?: 'bot' | 'user';
  opponentTelegramId?: string;
  difficulty?: BotDifficulty;
  botSeed?: string;
}

export async function POST(request: Request) {
  let body: BattleBody;
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
    let opponent: FighterSnapshot;
    let opponentUserId: string | null = null;
    const opponentType = body.opponentType ?? 'bot';

    if (opponentType === 'user') {
      const oppTg = (body.opponentTelegramId || '').trim();
      if (!oppTg) {
        return NextResponse.json({ error: 'opponentTelegramId required.' }, { status: 400 });
      }
      const oppUser = await getUserByTelegramIdFull(supabase, oppTg);
      if (!oppUser) {
        return NextResponse.json({ error: 'Opponent not found.' }, { status: 404 });
      }
      const oppCard = await getFighterByUserId(supabase, oppUser.id);
      if (!oppCard) {
        return NextResponse.json({ error: 'Opponent has no fighter.' }, { status: 400 });
      }
      opponentUserId = oppUser.id;
      const name = oppUser.wallet_address
        ? `${oppUser.wallet_address.slice(0, 4)}…${oppUser.wallet_address.slice(-4)}`
        : 'Fighter';
      opponent = fighterRowToSnapshot(oppCard, name);
    } else {
      opponent = createBotFighter(
        challenger.stats,
        challenger.totalScore,
        body.difficulty ?? 'normal',
        body.botSeed
      );
    }

    const resolution = resolveBattle(challenger, opponent);
    const challengerWon = resolution.winner === 'challenger';
    const winnerId = challengerWon ? user.id : opponentUserId;
    const pointsForChallenger = challengerWon ? BATTLE_WIN_POINTS : BATTLE_LOSS_POINTS;

    const { data: battle, error: battleErr } = await supabase
      .from('battles')
      .insert({
        challenger_id: user.id,
        opponent_id: opponentUserId,
        opponent_type: opponentType,
        bot_seed: opponentType === 'bot' ? body.botSeed ?? opponent.name : null,
        bot_name: opponentType === 'bot' ? opponent.name : null,
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
      challenger: toCardPayload(challenger),
      opponent: toCardPayload(opponent),
      resolution,
      challengerWon,
      pointsAwarded: pointsForChallenger,
      decidingStat: resolution.decidingStat,
    });
  } catch (err) {
    console.error('[api/battles] POST', err);
    return NextResponse.json({ error: 'Battle failed.' }, { status: 500 });
  }
}
