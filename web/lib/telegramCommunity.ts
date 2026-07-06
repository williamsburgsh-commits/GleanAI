import { getServiceClient } from '@/lib/supabaseServer';

const TELEGRAM_API = 'https://api.telegram.org';

export async function verifyTelegramCommunityMember(
  telegramId: string
): Promise<{ passed: boolean; detail: string }> {
  const chatId = process.env.TELEGRAM_COMMUNITY_CHAT_ID?.trim();
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!chatId || !botToken) {
    return {
      passed: false,
      detail: 'Community verification is not configured yet.',
    };
  }

  const url = `${TELEGRAM_API}/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${encodeURIComponent(telegramId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    return { passed: false, detail: 'Could not verify community membership.' };
  }

  const data = (await res.json()) as {
    ok: boolean;
    result?: { status?: string };
  };

  if (!data.ok) {
    return {
      passed: false,
      detail: 'Join the GleanAI Telegram community, then verify again.',
    };
  }

  const status = data.result?.status ?? '';
  const member = ['creator', 'administrator', 'member'].includes(status);
  return member
    ? { passed: true, detail: 'Community membership verified.' }
    : {
        passed: false,
        detail: 'Join the GleanAI Telegram community, then verify again.',
      };
}

export async function getUsedTxSignaturesForQuestType(
  userId: string,
  verificationType: string
): Promise<Set<string>> {
  const supabase = getServiceClient();
  const { data: quests } = await supabase
    .from('quests')
    .select('id')
    .eq('verification_type', verificationType);

  if (!quests?.length) return new Set();

  const questIds = quests.map((q) => q.id as string);
  const { data: completions } = await supabase
    .from('quest_completions')
    .select('tx_signature')
    .eq('user_id', userId)
    .in('quest_id', questIds)
    .not('tx_signature', 'is', null);

  return new Set(
    (completions ?? [])
      .map((c) => c.tx_signature as string | null)
      .filter((s): s is string => Boolean(s))
  );
}
