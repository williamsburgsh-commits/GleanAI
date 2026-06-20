import { getLeaderboard } from '../services/users.js';
import { LEADERBOARD_SIZE } from '../config.js';

const MEDALS = ['1.', '2.', '3.'];

export async function leaderboardCommand(ctx) {
  const rows = await getLeaderboard(LEADERBOARD_SIZE);

  if (rows.length === 0) {
    await ctx.reply('The leaderboard is empty. Be the first to earn points!');
    return;
  }

  const lines = rows.map((row, i) => {
    const rank = MEDALS[i] || `${i + 1}.`;
    const name = row.telegram_username ? `@${row.telegram_username}` : 'anonymous';
    return `${rank} ${name} - ${row.points} pts`;
  });

  await ctx.reply(`GleanAI Leaderboard\n\n${lines.join('\n')}`);
}
