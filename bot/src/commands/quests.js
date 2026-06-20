import { getOrCreateUser } from '../services/users.js';
import { getActiveQuests, getCompletedQuestIds } from '../services/quests.js';
import { buildWebLink } from '../lib/links.js';

export async function questsCommand(ctx) {
  const { user } = await getOrCreateUser({
    telegramId: ctx.from.id,
    username: ctx.from.username,
  });

  const [quests, completed] = await Promise.all([
    getActiveQuests(),
    getCompletedQuestIds(user.id),
  ]);

  if (quests.length === 0) {
    await ctx.reply('No quests are available right now. Check back soon!');
    return;
  }

  const lines = quests.map((q) => {
    const done = completed.has(q.id);
    const mark = done ? '[x]' : '[ ]';
    return `${mark} ${q.order_index}. ${q.title} (+${q.points} pts)\n    ${q.description}`;
  });

  const doneCount = quests.filter((q) => completed.has(q.id)).length;

  await ctx.reply(
    `Your Quests (${doneCount}/${quests.length} complete)\n\n` +
      lines.join('\n\n') +
      `\n\nComplete quests in the app:\n${buildWebLink(ctx.from.id)}`
  );
}
