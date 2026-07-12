import { getOrCreateUser } from '../services/users.js';
import { buildMiniAppPath, isWebAppCapable } from '../lib/links.js';
import {
  REFERRAL_QUESTS_BONUS,
  REFERRAL_QUESTS_REQUIRED,
  REFERRAL_WALLET_BONUS,
} from '../lib/pointsRules.js';

async function getBotUsername(ctx) {
  if (ctx.botInfo?.username) return ctx.botInfo.username;
  const me = await ctx.telegram.getMe();
  return me.username;
}

const PER_FRIEND_MAX = REFERRAL_WALLET_BONUS + REFERRAL_QUESTS_BONUS + 100;

export async function referralCommand(ctx) {
  const { user } = await getOrCreateUser({
    telegramId: ctx.from.id,
    username: ctx.from.username,
  });

  const botUsername = await getBotUsername(ctx);
  const link = `https://t.me/${botUsername}?start=${user.referral_code}`;

  const lines = [
    'Invite friends to GleanAI!',
    '',
    `Your code: ${user.referral_code}`,
    `Invite link:\n${link}`,
    '',
    `Earn up to ${PER_FRIEND_MAX} pts per friend:`,
    `· Friend links wallet → +${REFERRAL_WALLET_BONUS} pts`,
    `· Friend completes ${REFERRAL_QUESTS_REQUIRED} quests → +${REFERRAL_QUESTS_BONUS} pts + refer quest (+100)`,
    '',
    'Open GleanAI → Invite tab for sharing inside the Mini App.',
    'Friends must join via the Telegram bot link above (web links do not count).',
  ];

  const replyMarkup = isWebAppCapable()
    ? {
        inline_keyboard: [
          [
            {
              text: '📨 Open Invite tab',
              web_app: { url: `${buildMiniAppPath('app')}?tab=invite` },
            },
          ],
        ],
      }
    : undefined;

  await ctx.reply(lines.join('\n'), replyMarkup ? { reply_markup: replyMarkup } : {});
}
