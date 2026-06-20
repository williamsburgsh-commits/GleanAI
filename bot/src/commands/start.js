import { Markup } from 'telegraf';
import { getOrCreateUser, applyReferral } from '../services/users.js';
import { buildWebLink, buildMiniAppUrl, isWebAppCapable } from '../lib/links.js';

// Telegram passes /start payload as ctx.startPayload (e.g. a referral code).
export async function startCommand(ctx) {
  const from = ctx.from;
  const { user, isNew } = await getOrCreateUser({
    telegramId: from.id,
    username: from.username,
  });

  let referralNote = '';
  const payload = (ctx.startPayload || '').trim();
  if (isNew && payload) {
    const { applied } = await applyReferral({
      referredUserId: user.id,
      referralCode: payload.toUpperCase(),
    });
    if (applied) referralNote = '\n\nYou joined via a friend\'s invite - nice!';
  }

  const greeting = isNew
    ? `Welcome to GleanAI, ${from.first_name || 'explorer'}!`
    : `Welcome back, ${from.first_name || 'explorer'}!`;

  const message =
    `${greeting}\n\n` +
    'GleanAI helps you learn Solana by doing - complete fun quests, earn ' +
    'points, climb the leaderboard, and earn SOL rewards.\n\n' +
    'Tap below to open the GleanAI app, or use:\n' +
    '/quests - see your quests\n' +
    '/points - check your points\n' +
    '/leaderboard - see the top players\n' +
    '/referral - invite friends for bonus points' +
    referralNote;

  // web_app buttons require HTTPS; fall back to a normal link in local dev.
  const button = isWebAppCapable()
    ? Markup.button.webApp('🎮 Open GleanAI', buildMiniAppUrl())
    : Markup.button.url('🎮 Open GleanAI', buildWebLink(from.id, 'app'));

  await ctx.reply(message, Markup.inlineKeyboard([[button]]));
}
