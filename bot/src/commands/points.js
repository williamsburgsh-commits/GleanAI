import { getOrCreateUser } from '../services/users.js';
import { getLevelProgress } from '../lib/levels.js';
import { supabase } from '../supabase.js';
import { unwrap } from '../lib/errors.js';

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

  let fighterLine = '';
  const { data: fighter } = await supabase
    .from('fighter_cards')
    .select('rarity, total_score')
    .eq('user_id', user.id)
    .maybeSingle();
  if (fighter) {
    fighterLine = `\nFighter: ${fighter.rarity.toUpperCase()} · PWR ${fighter.total_score}`;
  }

  await ctx.reply(
    `You have ${user.points} point${user.points === 1 ? '' : 's'}.\n` +
      `${levelLine}\n${nextLine}${fighterLine}\n\n` +
      'Complete quests, battle in Wallet Wars, and invite friends to earn more!'
  );
}
