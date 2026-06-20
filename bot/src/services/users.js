import { supabase } from '../supabase.js';
import { unwrap } from '../lib/errors.js';
import { generateReferralCode } from '../lib/referral.js';
import { REFERRAL_BONUS_POINTS } from '../config.js';

// Fetch a user by Telegram ID, or null if not found.
export async function getUserByTelegramId(telegramId) {
  const data = unwrap(
    await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle(),
    'getUserByTelegramId'
  );
  return data;
}

// Create a user with a unique referral code, retrying on code collisions.
async function createUser({ telegramId, username }) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = generateReferralCode();
    const { data, error } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        telegram_username: username ?? null,
        referral_code: referralCode,
      })
      .select('*')
      .single();

    if (!error) return data;
    // 23505 = unique_violation; retry only if it was the referral_code.
    if (error.code === '23505' && /referral_code/.test(error.message)) continue;
    throw new Error(`Supabase error (createUser): ${error.message}`);
  }
  throw new Error('createUser: could not generate a unique referral code');
}

// Get the user for this Telegram account, creating it on first contact.
// Returns { user, isNew }.
export async function getOrCreateUser({ telegramId, username }) {
  const existing = await getUserByTelegramId(telegramId);
  if (existing) {
    // Keep username fresh if it changed.
    if (username && existing.telegram_username !== username) {
      unwrap(
        await supabase
          .from('users')
          .update({ telegram_username: username })
          .eq('id', existing.id),
        'getOrCreateUser:updateUsername'
      );
    }
    return { user: existing, isNew: false };
  }
  const user = await createUser({ telegramId, username });
  return { user, isNew: true };
}

// Apply a referral once: link referred -> referrer and award bonus points to
// the referrer. Idempotent via the referrals.referred_id unique constraint.
export async function applyReferral({ referredUserId, referralCode }) {
  if (!referralCode) return { applied: false };

  const referrer = unwrap(
    await supabase
      .from('users')
      .select('id, referral_code')
      .eq('referral_code', referralCode)
      .maybeSingle(),
    'applyReferral:findReferrer'
  );

  // No such code, or a user trying to refer themselves.
  if (!referrer || referrer.id === referredUserId) return { applied: false };

  const { error: insertError } = await supabase.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: referredUserId,
    points_awarded: REFERRAL_BONUS_POINTS,
  });

  // Already referred (unique violation) -> nothing to do.
  if (insertError) {
    if (insertError.code === '23505') return { applied: false };
    throw new Error(`Supabase error (applyReferral:insert): ${insertError.message}`);
  }

  unwrap(
    await supabase
      .from('users')
      .update({ referred_by: referrer.id })
      .eq('id', referredUserId),
    'applyReferral:setReferredBy'
  );

  await awardPoints({
    userId: referrer.id,
    amount: REFERRAL_BONUS_POINTS,
    reason: 'referral',
  });

  return { applied: true };
}

// Add points to a user and write a ledger row for auditability.
export async function awardPoints({ userId, amount, reason, refId = null }) {
  const user = unwrap(
    await supabase.from('users').select('points').eq('id', userId).single(),
    'awardPoints:read'
  );

  unwrap(
    await supabase
      .from('users')
      .update({ points: user.points + amount })
      .eq('id', userId),
    'awardPoints:update'
  );

  unwrap(
    await supabase
      .from('points_ledger')
      .insert({ user_id: userId, amount, reason, ref_id: refId }),
    'awardPoints:ledger'
  );
}

export async function getLeaderboard(limit) {
  return unwrap(
    await supabase
      .from('users')
      .select('telegram_username, points')
      .order('points', { ascending: false })
      .limit(limit),
    'getLeaderboard'
  );
}
