import { Telegraf } from 'telegraf';
import { config } from './config.js';
import { safeHandler } from './lib/errors.js';
import { startCommand } from './commands/start.js';
import { questsCommand } from './commands/quests.js';
import { pointsCommand } from './commands/points.js';
import { leaderboardCommand } from './commands/leaderboard.js';
import { referralCommand } from './commands/referral.js';

// Builds and wires the bot but does NOT launch it. Kept separate from index.js
// so it can be constructed in tests without opening a network connection.
export function buildBot() {
  const bot = new Telegraf(config.telegramBotToken);

  bot.start(safeHandler(startCommand));
  bot.command('quests', safeHandler(questsCommand));
  bot.command('points', safeHandler(pointsCommand));
  bot.command('leaderboard', safeHandler(leaderboardCommand));
  bot.command('referral', safeHandler(referralCommand));

  bot.catch((err, ctx) => {
    console.error(`[telegraf] unhandled error for ${ctx.updateType}`, err);
  });

  return bot;
}

export const COMMAND_DESCRIPTIONS = [
  { command: 'start', description: 'Start GleanAI and register' },
  { command: 'quests', description: 'See your quests' },
  { command: 'points', description: 'Check your points' },
  { command: 'leaderboard', description: 'See the top players' },
  { command: 'referral', description: 'Invite friends for bonus points' },
];
