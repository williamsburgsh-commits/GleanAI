import { getOrCreateUser } from '../services/users.js';
import { getLevelProgress } from '../lib/levels.js';

export async function pointsCommand(ctx) {
  const { user } = await getOrCreateUser({
    telegramId: ctx.from.id,
    username: ctx.from.username,
  });

  const lvl = getLevelProgress(user.points);
  const levelLine = `Level ${lvl.level} · ${lvl.title}`;
  const nextLine = lvl.isMax
    ? 'You hit the max level. Legend.'
    : `${lvl.pointsToNext} point${lvl.pointsToNext === 1 ? '' : 's'} to level ${lvl.level + 1}.`;

  await ctx.reply(
    `You have ${user.points} point${user.points === 1 ? '' : 's'}.\n` +
      `${levelLine}\n${nextLine}\n\n` +
      'Complete quests and invite friends to earn more!'
  );
}
