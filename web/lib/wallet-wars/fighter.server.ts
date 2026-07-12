import { getServiceClient } from '@/lib/supabaseServer';
import type { FighterRarity } from '@/lib/wallet-wars/rarity';
import type { QuestBonus } from '@/lib/wallet-wars/questBoosts';
import { fetchWalletMetrics } from '@/lib/wallet-wars/metrics';
import { buildFighterStats } from '@/lib/wallet-wars/fighterStats';
import {
  getUserByTelegramId,
  getCompletedQuestIds,
  getActiveQuests,
  getQuestBySlug,
  recordCompletion,
  type UserRow,
  type QuestRow,
} from '@/lib/quests.server';

type Supa = ReturnType<typeof getServiceClient>;

export interface FighterCardRow {
  id: string;
  user_id: string;
  wallet_address: string;
  shield: number;
  power: number;
  strike: number;
  armor: number;
  agility: number;
  total_score: number;
  rarity: FighterRarity;
  avatar_url: string;
  quest_bonus: QuestBonus;
  scanned_at: string;
}

export interface BattleRow {
  id: string;
  challenger_id: string;
  opponent_id: string | null;
  opponent_type: 'bot' | 'user' | 'boss';
  bot_seed: string | null;
  bot_name: string | null;
  winner_id: string | null;
  stat_results: unknown;
  points_awarded: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  completed_at: string | null;
}

export async function getFighterByUserId(
  supabase: Supa,
  userId: string
): Promise<FighterCardRow | null> {
  const { data, error } = await supabase
    .from('fighter_cards')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as FighterCardRow | null;
}

export async function getCompletedQuestSlugs(
  supabase: Supa,
  userId: string
): Promise<Set<string>> {
  const questIds = await getCompletedQuestIds(supabase, userId);
  const quests = await getActiveQuests(supabase);
  const slugs = new Set<string>();
  for (const q of quests) {
    if (questIds.has(q.id)) slugs.add(q.slug);
  }
  return slugs;
}

export function getRescanCooldownHours(): number {
  const raw = process.env.FIGHTER_RESCAN_HOURS;
  const n = raw ? Number(raw) : 24;
  return Number.isFinite(n) && n > 0 ? n : 24;
}

export function canRescan(scannedAt: string): { allowed: boolean; nextAt: Date | null } {
  const hours = getRescanCooldownHours();
  const last = new Date(scannedAt).getTime();
  const next = last + hours * 3_600_000;
  if (Date.now() >= next) return { allowed: true, nextAt: null };
  return { allowed: false, nextAt: new Date(next) };
}

export async function scanAndUpsertFighter(
  supabase: Supa,
  user: UserRow
): Promise<{ fighter: FighterCardRow; isFirstScan: boolean }> {
  if (!user.wallet_address) throw new Error('Wallet not linked');

  const existing = await getFighterByUserId(supabase, user.id);
  if (existing) {
    const cooldown = canRescan(existing.scanned_at);
    if (!cooldown.allowed) {
      throw new Error(
        `Rescan available after ${cooldown.nextAt?.toISOString() ?? 'later'}.`
      );
    }
  }

  const metrics = await fetchWalletMetrics(user.wallet_address);
  const completedSlugs = await getCompletedQuestSlugs(supabase, user.id);
  const stats = buildFighterStats(user.wallet_address, metrics, completedSlugs);

  const row = {
    user_id: user.id,
    wallet_address: user.wallet_address,
    shield: stats.shield,
    power: stats.power,
    strike: stats.strike,
    armor: stats.armor,
    agility: stats.agility,
    total_score: stats.totalScore,
    rarity: stats.rarity,
    avatar_url: stats.avatarUrl,
    quest_bonus: stats.questBonus,
    scanned_at: new Date().toISOString(),
  };

  const { data: fighter, error } = await supabase
    .from('fighter_cards')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;

  await supabase.from('wallet_scans').insert({
    user_id: user.id,
    wallet_address: user.wallet_address,
    raw_metrics: metrics,
    stat_snapshot: stats,
  });

  const isFirstScan = !existing;
  if (isFirstScan) {
    const quest = await getQuestBySlug(supabase, 'scan-fighter');
    if (quest) {
      await recordCompletion(supabase, { user, quest });
    }
  }

  return { fighter: fighter as FighterCardRow, isFirstScan };
}

export async function awardBattlePoints(
  supabase: Supa,
  userId: string,
  amount: number,
  reason: 'battle:win' | 'battle:loss' | 'battle:tie',
  refId?: string,
  won?: boolean
): Promise<{ pointsBefore: number; pointsAfter: number; winStreak: number }> {
  const { data: user, error } = await supabase
    .from('users')
    .select('points, win_streak')
    .eq('id', userId)
    .single();
  if (error) throw error;

  const pointsBefore = user.points as number;
  const pointsAfter = pointsBefore + amount;
  let winStreak = (user.win_streak as number) ?? 0;

  if (won === true) {
    winStreak += 1;
  } else if (won === false) {
    winStreak = 0;
  }

  if (amount > 0) {
    await supabase
      .from('users')
      .update({ points: pointsAfter, win_streak: winStreak })
      .eq('id', userId);

    await supabase.from('points_ledger').insert({
      user_id: userId,
      amount,
      reason,
      ref_id: refId ?? null,
    });
  } else {
    await supabase.from('users').update({ win_streak: winStreak }).eq('id', userId);
  }

  return { pointsBefore, pointsAfter, winStreak };
}

export async function countBattleWins(supabase: Supa, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('battles')
    .select('id', { count: 'exact', head: true })
    .eq('winner_id', userId)
    .eq('status', 'completed');
  if (error) throw error;
  return count ?? 0;
}

export async function awardBattleQuests(
  supabase: Supa,
  user: UserRow,
  won: boolean
): Promise<void> {
  if (!won) return;
  const wins = await countBattleWins(supabase, user.id);
  if (wins === 1) {
    const q = await getQuestBySlug(supabase, 'win-first-battle');
    if (q) await recordCompletion(supabase, { user, quest: q });
  }
  if (wins >= 3) {
    const q = await getQuestBySlug(supabase, 'win-three-battles');
    if (q) await recordCompletion(supabase, { user, quest: q });
  }
}

export async function getBattleDailyCount(supabase: Supa, userId: string): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('battles')
    .select('id', { count: 'exact', head: true })
    .eq('challenger_id', userId)
    .gte('created_at', start.toISOString());
  if (error) throw error;
  return count ?? 0;
}

/** GO-LIVE: set BATTLE_DAILY_LIMIT_ENABLED=true in production before launch. */
export function isBattleDailyLimitEnabled(): boolean {
  return process.env.BATTLE_DAILY_LIMIT_ENABLED === 'true';
}

export function getMaxBattlesPerDay(): number {
  const raw = process.env.MAX_BATTLES_PER_DAY;
  const n = raw ? Number(raw) : 10;
  return Number.isFinite(n) && n > 0 ? n : 10;
}

export async function getBattleDailyLimitError(
  supabase: Supa,
  userId: string
): Promise<string | null> {
  if (!isBattleDailyLimitEnabled()) return null;
  const daily = await getBattleDailyCount(supabase, userId);
  if (daily >= getMaxBattlesPerDay()) {
    return 'Daily battle limit reached.';
  }
  return null;
}

export async function getUserByTelegramIdFull(
  supabase: Supa,
  telegramId: string
): Promise<UserRow | null> {
  return getUserByTelegramId(supabase, telegramId);
}

export type { UserRow, QuestRow };
