import { supabase } from '../supabase.js';
import { unwrap } from '../lib/errors.js';
import { buildMiniAppUrl } from '../lib/links.js';

export async function warCommand(ctx) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = unwrap(
    await supabase
      .from('users')
      .select('id, wallet_address, points')
      .eq('telegram_id', telegramId)
      .maybeSingle(),
    'warCommand:user'
  );

  if (!user) {
    await ctx.reply('Run /start first to register.');
    return;
  }

  let fighterLine = 'No fighter scanned yet.';
  if (user.wallet_address) {
    const fighter = unwrap(
      await supabase
        .from('fighter_cards')
        .select('rarity, total_score, shield, power, strike, agility')
        .eq('user_id', user.id)
        .maybeSingle(),
      'warCommand:fighter'
    );
    if (fighter) {
      fighterLine =
        `Fighter: ${fighter.rarity.toUpperCase()} · PWR ${fighter.total_score}\n` +
        `Shield ${fighter.shield} · Power ${fighter.power} · Strike ${fighter.strike} · Agility ${fighter.agility}`;
    } else {
      fighterLine = 'Wallet linked — open the app and scan your fighter.';
    }
  }

  const url = buildWebLink(String(telegramId), 'wallet-wars');

  await ctx.reply(
    `⚔️ Wallet Wars\n\n${fighterLine}\n\nPoints: ${user.points}\n\nOpen the arena:`,
  );
  await ctx.reply('🎮 Wallet Wars', {
    reply_markup: {
      inline_keyboard: [[{ text: '⚔️ Open Wallet Wars', web_app: { url } }]],
    },
  });
}
