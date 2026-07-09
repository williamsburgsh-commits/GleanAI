import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  getFighterByUserId,
  getUserByTelegramIdFull,
  getBattleDailyLimitError,
} from '@/lib/wallet-wars/fighter.server';
import {
  resolveBattle,
  BATTLE_WIN_POINTS,
  BATTLE_LOSS_POINTS,
  BATTLE_TIE_POINTS,
  type FighterSnapshot,
} from '@/lib/wallet-wars/battleResolver';
import { fighterRowToSnapshot } from '@/lib/wallet-wars/botFactory';
import { buildBossSnapshot } from '@/lib/wallet-wars/bossFactory';
import {
  assertCanFightBoss,
  getOrCreateRun,
  randomBossTaunt,
  recordBossOutcome,
} from '@/lib/wallet-wars/bossGauntlet.server';
import { isBossSlug } from '@/lib/wallet-wars/bosses';

export const runtime = 'nodejs';

function toCardPayload(f: FighterSnapshot) {
  return {
    name: f.name,
    walletAddress: f.walletAddress,
    avatarUrl: f.avatarUrl,
    strike: f.stats.strike,
    shield: f.stats.shield,
    power: f.stats.power,
    armor: f.stats.armor,
    agility: f.stats.agility,
    totalScore: f.totalScore,
    rarity: f.rarity,
    stats: f.stats,
  };
}

interface BossBattleBody {
  telegramId?: string;
  bossSlug?: string;
  taunt?: string;
}

export async function POST(request: Request) {
  let body: BossBattleBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  const bossSlug = (body.bossSlug || '').trim();

  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ error: 'telegramId is required.' }, { status: 400 });
  }
  if (!isBossSlug(bossSlug)) {
    return NextResponse.json({ error: 'Valid bossSlug is required.' }, { status: 400 });
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

    const dailyLimitError = await getBattleDailyLimitError(supabase, user.id);
    if (dailyLimitError) {
      return NextResponse.json({ error: dailyLimitError }, { status: 429 });
    }

    const run = await getOrCreateRun(supabase, user.id);
    try {
      assertCanFightBoss(run, bossSlug);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Boss locked.' },
        { status: 400 }
      );
    }

    const challenger = fighterRowToSnapshot(challengerCard);
    const { snapshot: opponent, definition: boss } = await buildBossSnapshot(
      bossSlug,
      challenger.stats,
      challenger.totalScore
    );

    const resolution = resolveBattle(challenger, opponent);
    const challengerWon = resolution.winner === 'challenger';
    const isTie = resolution.winner === 'tie';
    const winnerId = isTie ? null : challengerWon ? user.id : null;
    const basePoints = isTie
      ? BATTLE_TIE_POINTS
      : challengerWon
        ? BATTLE_WIN_POINTS
        : BATTLE_LOSS_POINTS;
    const winBonus = challengerWon && !isTie ? (boss.winBonus ?? 0) : 0;
    const pointsForChallenger = basePoints + winBonus;

    const { data: battle, error: battleErr } = await supabase
      .from('battles')
      .insert({
        challenger_id: user.id,
        opponent_id: null,
        opponent_type: 'boss',
        bot_name: boss.name,
        boss_slug: bossSlug,
        opponent_wallet_address: boss.walletAddress,
        gauntlet_run_id: run.id,
        winner_id: winnerId,
        stat_results: resolution.rounds,
        points_awarded: pointsForChallenger,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (battleErr) throw battleErr;

    const { pointsBefore, winStreak, becameChampion } = await recordBossOutcome(
      supabase,
      user,
      run,
      bossSlug,
      battle.id as string,
      challengerWon,
      isTie,
      basePoints
    );

    const opponentTaunt = randomBossTaunt(boss);

    return NextResponse.json({
      battleId: battle.id,
      challenger: toCardPayload(challenger),
      opponent: toCardPayload(opponent),
      resolution,
      challengerWon,
      isTie,
      pointsAwarded: pointsForChallenger,
      pointsBefore,
      winStreak,
      taunt: body.taunt ?? null,
      opponentTaunt,
      decidingStat: resolution.decidingStat,
      battleMode: 'boss',
      bossSlug,
      bossName: boss.name,
      bossTitle: boss.title,
      bossIntroLine: boss.introLine,
      bossTier: boss.tier,
      becameChampion,
    });
  } catch (err) {
    console.error('[api/boss-gauntlet/battle] POST', err);
    return NextResponse.json({ error: 'Boss battle failed.' }, { status: 500 });
  }
}
