import { config } from '../config.js';
import { getOrCreateUser } from '../services/users.js';
import { REFERRAL_BONUS_POINTS } from '../config.js';

async function getBotUsername(ctx) {
  if (ctx.botInfo?.username) return ctx.botInfo.username;
  const me = await ctx.telegram.getMe();
  return me.username;
}

export async function referralCommand(ctx) {
  const { user } = await getOrCreateUser({
    telegramId: ctx.from.id,
    username: ctx.from.username,
  });

  const botUsername = await getBotUsername(ctx);
  const link = `https://t.me/${botUsername}?start=${user.referral_code}`;

  await ctx.reply(
    'Invite friends to GleanAI!\n\n' +
      `Your referral code: ${user.referral_code}\n` +
      `Your invite link:\n${link}\n\n` +
      `You earn ${REFERRAL_BONUS_POINTS} points for every friend who joins ` +
      'through your link.'
  );
}
