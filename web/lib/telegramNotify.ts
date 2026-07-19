const TELEGRAM_API = 'https://api.telegram.org';

/** Best-effort Telegram DM. Logs and returns false if bot token missing or user blocked bot. */
export async function sendTelegramMessage(
  telegramId: string | number,
  text: string
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) {
    console.warn('[telegramNotify] TELEGRAM_BOT_TOKEN unset');
    return false;
  }
  const chatId = String(telegramId).trim();
  if (!chatId || !/^\d+$/.test(chatId)) return false;

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[telegramNotify] sendMessage', res.status, body.slice(0, 200));
      return false;
    }
    const data = (await res.json()) as { ok?: boolean };
    return Boolean(data.ok);
  } catch (err) {
    console.warn('[telegramNotify] sendMessage error', err);
    return false;
  }
}

export function formatQuestClearedMessage(params: {
  title: string;
  points: number;
}): string {
  const webApp = process.env.WEB_APP_URL?.trim();
  const tail = webApp ? `\nOpen Mini App: ${webApp}` : '\nOpen the Mini App to continue.';
  return `QUEST CLEARED — ${params.title} (+${params.points} pts).${tail}`;
}
