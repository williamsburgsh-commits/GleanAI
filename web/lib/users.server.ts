import { getServiceClient } from './supabaseServer';
import { generateReferralCode } from './referral';
import type { UserRow } from './quests.server';

type Supa = ReturnType<typeof getServiceClient>;

// Returns the user for a Telegram id, creating one (with a unique referral
// code) if it doesn't exist yet. Mirrors the bot's get-or-create behaviour so
// web-first players (e.g. arriving via a Sprint link) still get a row.
export async function getOrCreateUserByTelegramId(
  supabase: Supa,
  telegramId: string,
  opts: { username?: string | null } = {}
): Promise<UserRow> {
  const username = opts.username?.trim() || null;

  const { data: existing, error: findErr } = await supabase
    .from('users')
    .select('id, telegram_id, wallet_address, points')
    .eq('telegram_id', telegramId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) {
    // Keep the stored username fresh (handle changes / late capture).
    if (username) {
      await supabase
        .from('users')
        .update({ telegram_username: username })
        .eq('id', existing.id);
    }
    return existing as UserRow;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        telegram_username: username,
        referral_code: generateReferralCode(),
      })
      .select('id, telegram_id, wallet_address, points')
      .single();
    if (!error) return data as UserRow;
    if (error.code === '23505') {
      if (/referral_code/.test(error.message)) continue;
      // Another request (e.g. bot /start) created this user first — fetch it.
      if (/telegram_id/.test(error.message)) {
        const { data: raced, error: raceErr } = await supabase
          .from('users')
          .select('id, telegram_id, wallet_address, points')
          .eq('telegram_id', telegramId)
          .maybeSingle();
        if (raceErr) throw raceErr;
        if (raced) return raced as UserRow;
      }
    }
    throw error;
  }
  throw new Error('Could not create user (referral code collisions).');
}
