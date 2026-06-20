import { getOrCreateUser } from '../services/users.js';

export async function pointsCommand(ctx) {
  const { user } = await getOrCreateUser({
    telegramId: ctx.from.id,
    username: ctx.from.username,
  });

  await ctx.reply(
    `You have ${user.points} point${user.points === 1 ? '' : 's'}.\n\n` +
      'Complete quests and invite friends to earn more!'
  );
}
