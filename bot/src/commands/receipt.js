import { supabase } from '../supabase.js';
import { unwrap } from '../lib/errors.js';
import { buildMiniAppPath } from '../lib/links.js';

export async function receiptCommand(ctx) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const user = unwrap(
    await supabase
      .from('users')
      .select('id, wallet_address, points')
      .eq('telegram_id', telegramId)
      .maybeSingle(),
    'receiptCommand:user'
  );

  if (!user) {
    await ctx.reply('Run /start first to register.');
    return;
  }

  const walletLine = user.wallet_address
    ? `Wallet: ${user.wallet_address.slice(0, 4)}…${user.wallet_address.slice(-4)}`
    : 'No wallet linked yet — connect Phantom in the app first.';

  const url = buildMiniAppPath('receipt');

  await ctx.reply(
    `🧾 The Receipt\n\n${walletLine}\n\nPrint your lifetime Solana fee receipt and flex your savings vs Ethereum.`
  );
  await ctx.reply('🧾 The Receipt', {
    reply_markup: {
      inline_keyboard: [[{ text: '🧾 Print Receipt', web_app: { url } }]],
    },
  });
}
