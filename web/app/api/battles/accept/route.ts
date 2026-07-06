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
import { fighterRowToSnapshot } from '@/lib/wallet-wars/botFactory';
import { getQuestBySlug, recordCompletion } from '@/lib/quests.server';
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
  let body: { telegramId?: string; inviteCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  const inviteCode = (body.inviteCode || '').toString().trim();
  if (!telegramId || !inviteCode) {
    return NextResponse.json({ error: 'telegramId and inviteCode required.' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch {
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const acceptor = await getUserByTelegramIdFull(supabase, telegramId);
    if (!acceptor) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    const { data: invite, error: invErr } = await supabase
      .from('battle_invites')
      .select('*')
      .eq('code', inviteCode)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!invite) return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
    if (new Date(invite.expires_at as string) < new Date()) {
      return NextResponse.json({ error: 'Invite expired.' }, { status: 410 });
    }
    if (invite.accepted_by) {
      return NextResponse.json({ error: 'Invite already used.' }, { status: 409 });
    }
    if (invite.creator_id === acceptor.id) {
      return NextResponse.json({ error: 'Cannot battle yourself.' }, { status: 400 });
    }

    const daily = await getBattleDailyCount(supabase, acceptor.id);
    if (daily >= getMaxBattlesPerDay()) {
      return NextResponse.json({ error: 'Daily battle limit reached.' }, { status: 429 });
    }

    const creator = unwrapUser(
      await supabase.from('users').select('*').eq('id', invite.creator_id).single()
    );

    const creatorCard = await getFighterByUserId(supabase, creator.id);
    const acceptorCard = await getFighterByUserId(supabase, acceptor.id);
    if (!creatorCard || !acceptorCard) {
      return NextResponse.json({ error: 'Both fighters must be scanned.' }, { status: 400 });
    }

    const challenger = fighterRowToSnapshot(creatorCard);
    const opponent = fighterRowToSnapshot(acceptorCard);
    const resolution = resolveBattle(challenger, opponent);

    const creatorWon = resolution.winner === 'challenger';
    const creatorPoints = creatorWon ? BATTLE_WIN_POINTS : BATTLE_LOSS_POINTS;
    const acceptorPoints = creatorWon ? BATTLE_LOSS_POINTS : BATTLE_WIN_POINTS;

    const { data: battle, error: battleErr } = await supabase
      .from('battles')
      .insert({
        challenger_id: creator.id,
        opponent_id: acceptor.id,
        opponent_type: 'user',
        winner_id: creatorWon ? creator.id : acceptor.id,
        stat_results: resolution.rounds,
        points_awarded: creatorPoints,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (battleErr) throw battleErr;

    await supabase
      .from('battle_invites')
      .update({ accepted_by: acceptor.id, battle_id: battle.id })
      .eq('id', invite.id);

    await awardBattlePoints(supabase, creator.id, creatorPoints, creatorWon ? 'battle:win' : 'battle:loss', battle.id as string);
    await awardBattlePoints(supabase, acceptor.id, acceptorPoints, creatorWon ? 'battle:loss' : 'battle:win', battle.id as string);
    await awardBattleQuests(supabase, creator, creatorWon);
    await awardBattleQuests(supabase, acceptor, !creatorWon);

    const challengeQuest = await getQuestBySlug(supabase, 'challenge-friend');
    if (challengeQuest) {
      await recordCompletion(supabase, { user: creator, quest: challengeQuest });
      await recordCompletion(supabase, { user: acceptor, quest: challengeQuest });
    }

    const acceptorWon = resolution.winner === 'opponent';

    return NextResponse.json({
      battleId: battle.id,
      challenger: toCardPayload(challenger),
      opponent: toCardPayload(opponent),
      resolution,
      acceptorWon,
      pointsAwarded: acceptorPoints,
      decidingStat: resolution.decidingStat,
    });
  } catch (err) {
    console.error('[api/battles/accept]', err);
    return NextResponse.json({ error: 'Could not accept invite.' }, { status: 500 });
  }
}

function unwrapUser(result: { data: unknown; error: unknown }) {
  if (result.error) throw result.error;
  return result.data as {
    id: string;
    telegram_id: number;
    wallet_address: string | null;
    points: number;
  };
}
