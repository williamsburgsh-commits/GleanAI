import { getServiceClient } from './supabaseServer';
import type { VerificationType } from './solana/verify';

export interface QuestRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  points: number;
  verification_type: VerificationType;
  order_index: number;
}

export interface UserRow {
  id: string;
  telegram_id: number;
  wallet_address: string | null;
  points: number;
}

type Supa = ReturnType<typeof getServiceClient>;

export async function getUserByTelegramId(
  supabase: Supa,
  telegramId: string
): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, telegram_id, wallet_address, points')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (error) throw error;
  return data as UserRow | null;
}

export async function getQuestBySlug(
  supabase: Supa,
  slug: string
): Promise<QuestRow | null> {
  const { data, error } = await supabase
    .from('quests')
    .select('id, slug, title, description, points, verification_type, order_index')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data as QuestRow | null;
}

export async function getActiveQuests(supabase: Supa): Promise<QuestRow[]> {
  const { data, error } = await supabase
    .from('quests')
    .select('id, slug, title, description, points, verification_type, order_index')
    .eq('is_active', true)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return (data ?? []) as QuestRow[];
}

export async function getCompletedQuestIds(
  supabase: Supa,
  userId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('quest_completions')
    .select('quest_id')
    .eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.quest_id as string));
}

export async function isTxSignatureClaimedGlobally(
  supabase: Supa,
  txSignature: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('quest_completions')
    .select('id')
    .eq('tx_signature', txSignature)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

// Records a completion + awards points + writes a ledger row. Idempotent via
// the quest_completions (user_id, quest_id) unique constraint.
// Returns { awarded } where awarded is false if it was already completed.
export async function recordCompletion(
  supabase: Supa,
  params: {
    user: UserRow;
    quest: QuestRow;
    txSignature?: string | null;
  }
): Promise<{ awarded: boolean }> {
  const { user, quest, txSignature } = params;

  const { error: insertErr } = await supabase.from('quest_completions').insert({
    user_id: user.id,
    quest_id: quest.id,
    tx_signature: txSignature ?? null,
    points_awarded: quest.points,
  });

  if (insertErr) {
    // Already completed -> not an error for our purposes.
    if (insertErr.code === '23505') return { awarded: false };
    throw insertErr;
  }

  // Award points and write an audit ledger entry.
  const { error: updateErr } = await supabase
    .from('users')
    .update({ points: user.points + quest.points })
    .eq('id', user.id);
  if (updateErr) throw updateErr;

  const { error: ledgerErr } = await supabase.from('points_ledger').insert({
    user_id: user.id,
    amount: quest.points,
    reason: `quest:${quest.slug}`,
    ref_id: quest.id,
  });
  if (ledgerErr) throw ledgerErr;

  const { processReferralMilestones } = await import('@/lib/points/referrals.server');
  await processReferralMilestones(supabase, user.id);

  return { awarded: true };
}
