import { getServiceClient } from '@/lib/supabaseServer';
import { getUserByTelegramId, getCompletedQuestIds, getQuestBySlug } from '@/lib/quests.server';
import { sumLedgerByPrefix } from '@/lib/points/award.server';
import { getOrCreateCurrentEpoch } from '@/lib/points/epochs.server';
import {
  REFERRAL_LIFETIME_CAP,
  REFERRAL_QUESTS_BONUS,
  REFERRAL_QUESTS_REQUIRED,
  REFERRAL_WALLET_BONUS,
} from '@/lib/points/rules';
import { buildInviteLink, getBotUsername } from '@/lib/telegramBot';

type Supa = ReturnType<typeof getServiceClient>;

export interface ReferralFriendRow {
  username: string | null;
  telegramId: string;
  joinedAt: string;
  walletLinked: boolean;
  questCount: number;
  questsRequired: number;
  milestonesComplete: boolean;
  pointsEarnedFromFriend: number;
}

export interface ReferralInfo {
  referralCode: string;
  inviteLink: string;
  botUsername: string;
  milestones: { wallet: number; quests: number; questSlug: number };
  lifetimeCap: number;
  earnedLifetime: number;
  earnedThisEpoch: number;
  referFriendQuestCompleted: boolean;
  friends: ReferralFriendRow[];
}

function pointsFromFriend(
  walletMilestoneAt: string | null,
  questsMilestoneAt: string | null
): number {
  let total = 0;
  if (walletMilestoneAt) total += REFERRAL_WALLET_BONUS;
  if (questsMilestoneAt) {
    total += REFERRAL_QUESTS_BONUS + 100; // refer-friend quest points
  }
  return total;
}

export async function getReferralInfo(
  supabase: Supa,
  telegramId: string
): Promise<ReferralInfo | null> {
  const user = await getUserByTelegramId(supabase, telegramId);
  if (!user) return null;

  const { data: fullUser, error: userErr } = await supabase
    .from('users')
    .select('id, referral_code')
    .eq('telegram_id', telegramId)
    .single();
  if (userErr || !fullUser?.referral_code) throw userErr ?? new Error('User missing referral code.');

  const botUsername = await getBotUsername();
  const referralCode = fullUser.referral_code as string;
  const inviteLink = buildInviteLink(botUsername, referralCode);

  const epoch = await getOrCreateCurrentEpoch(supabase);
  const earnedLifetime = await sumLedgerByPrefix(supabase, user.id, 'referral:');
  const earnedThisEpoch = await sumLedgerByPrefix(
    supabase,
    user.id,
    'referral:',
    epoch.starts_at
  );

  const referQuest = await getQuestBySlug(supabase, 'refer-friend');
  const completed = await getCompletedQuestIds(supabase, user.id);
  const referFriendQuestCompleted = referQuest ? completed.has(referQuest.id) : false;

  const { data: referrals, error: refErr } = await supabase
    .from('referrals')
    .select('id, referred_id, created_at, wallet_milestone_at, quests_milestone_at')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false });
  if (refErr) throw refErr;

  const friends: ReferralFriendRow[] = [];
  for (const row of referrals ?? []) {
    const referredId = row.referred_id as string;
    const { data: referred, error: rErr } = await supabase
      .from('users')
      .select('telegram_id, telegram_username, wallet_address')
      .eq('id', referredId)
      .single();
    if (rErr || !referred) continue;

    const { count, error: cErr } = await supabase
      .from('quest_completions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', referredId);
    if (cErr) throw cErr;

    const questCount = count ?? 0;
    const walletLinked = Boolean(referred.wallet_address);
    const milestonesComplete = Boolean(row.quests_milestone_at);

    friends.push({
      username: (referred.telegram_username as string | null) ?? null,
      telegramId: String(referred.telegram_id),
      joinedAt: row.created_at as string,
      walletLinked,
      questCount,
      questsRequired: REFERRAL_QUESTS_REQUIRED,
      milestonesComplete,
      pointsEarnedFromFriend: pointsFromFriend(
        row.wallet_milestone_at as string | null,
        row.quests_milestone_at as string | null
      ),
    });
  }

  return {
    referralCode,
    inviteLink,
    botUsername,
    milestones: {
      wallet: REFERRAL_WALLET_BONUS,
      quests: REFERRAL_QUESTS_BONUS,
      questSlug: 100,
    },
    lifetimeCap: REFERRAL_LIFETIME_CAP,
    earnedLifetime,
    earnedThisEpoch,
    referFriendQuestCompleted,
    friends,
  };
}
