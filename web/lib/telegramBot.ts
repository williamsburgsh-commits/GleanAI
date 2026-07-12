import 'server-only';

import { buildInviteLink } from '@/lib/telegramInvite';

const TELEGRAM_API = 'https://api.telegram.org';

let cachedBotUsername: string | null = null;

export { buildInviteLink } from '@/lib/telegramInvite';

export function buildMiniAppInviteUrl(tab: 'invite' | 'rank' | 'play' = 'invite'): string {
  const base =
    process.env.NEXT_PUBLIC_WEB_APP_URL?.replace(/\/$/, '') ||
    process.env.WEB_APP_URL?.replace(/\/$/, '') ||
    'https://glean-ai-web.vercel.app';
  return `${base}/app?tab=${tab}`;
}

/** Resolve bot @username from env or Telegram getMe (cached). */
export async function getBotUsername(): Promise<string> {
  const fromEnv =
    process.env.TELEGRAM_BOT_USERNAME?.trim() ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim();
  if (fromEnv) return fromEnv.replace(/^@/, '');

  if (cachedBotUsername) return cachedBotUsername;

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error('TELEGRAM_BOT_USERNAME or TELEGRAM_BOT_TOKEN is required.');
  }

  const res = await fetch(`${TELEGRAM_API}/bot${token}/getMe`);
  if (!res.ok) throw new Error('Could not resolve Telegram bot username.');
  const data = (await res.json()) as { ok?: boolean; result?: { username?: string } };
  const username = data.result?.username;
  if (!username) throw new Error('Telegram getMe returned no username.');
  cachedBotUsername = username;
  return username;
}
