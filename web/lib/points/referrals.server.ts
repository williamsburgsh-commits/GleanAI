import { getServiceClient } from '@/lib/supabaseServer';
import { getQuestBySlug, recordCompletion, type UserRow } from '@/lib/quests.server';
import { awardPoints, sumLedgerByPrefix } from '@/lib/points/award.server';
import {
  REFERRAL_LIFETIME_CAP,
  REFERRAL_QUESTS_BONUS,
  REFERRAL_QUESTS_REQUIRED,
  REFERRAL_WALLET_BONUS,
} from '@/lib/points/rules';

type Supa = ReturnType<typeof getServiceClient>;

async function countCompletedQuests(supabase: Supa, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('quest_completions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return count ?? 0;
}

async function referralPointsEarned(supabase: Supa, referrerId: string): Promise<number> {
  return sumLedgerByPrefix(supabase, referrerId, 'referral:');
}

async function awardReferralBonus(
  supabase: Supa,
  referrerId: string,
  amount: number,
  reason: string,
  refId: string
): Promise<boolean> {
  const earned = await referralPointsEarned(supabase, referrerId);
  if (earned >= REFERRAL_LIFETIME_CAP) return false;

  const capped = Math.min(amount, REFERRAL_LIFETIME_CAP - earned);
  if (capped <= 0) return false;

  await awardPoints(supabase, {
    userId: referrerId,
    amount: capped,
    reason,
    refId,
  });
  return true;
}

/**
 * Called when a referred user links a wallet or completes a quest.
 * Awards referrer: +25 on wallet link, +75 at 3 quests, +100 refer-friend quest.
 */
export async function processReferralMilestones(
  supabase: Supa,
  referredUserId: string
): Promise<void> {
  const { data: referred, error: userErr } = await supabase
    .from('users')
    .select('id, wallet_address, referred_by')
    .eq('id', referredUserId)
    .single();
  if (userErr || !referred?.referred_by) return;

  const { data: referral, error: refErr } = await supabase
    .from('referrals')
    .select('id, referrer_id, wallet_milestone_at, quests_milestone_at')
    .eq('referred_id', referredUserId)
    .maybeSingle();
  if (refErr || !referral) return;

  const referrerId = referral.referrer_id as string;

  if (referred.wallet_address && !referral.wallet_milestone_at) {
    await awardReferralBonus(
      supabase,
      referrerId,
      REFERRAL_WALLET_BONUS,
      'referral:wallet',
      referral.id as string
    );
    await supabase
      .from('referrals')
      .update({ wallet_milestone_at: new Date().toISOString() })
      .eq('id', referral.id);
  }

  const questCount = await countCompletedQuests(supabase, referredUserId);
  if (questCount >= REFERRAL_QUESTS_REQUIRED && !referral.quests_milestone_at) {
    await awardReferralBonus(
      supabase,
      referrerId,
      REFERRAL_QUESTS_BONUS,
      'referral:quests',
      referral.id as string
    );

    const { data: referrer, error: rErr } = await supabase
      .from('users')
      .select('id, telegram_id, wallet_address, points')
      .eq('id', referrerId)
      .single();
    if (!rErr && referrer) {
      const referQuest = await getQuestBySlug(supabase, 'refer-friend');
      if (referQuest) {
        await recordCompletion(supabase, {
          user: referrer as UserRow,
          quest: referQuest,
        });
      }
    }

    await supabase
      .from('referrals')
      .update({ quests_milestone_at: new Date().toISOString() })
      .eq('id', referral.id);
  }
}
