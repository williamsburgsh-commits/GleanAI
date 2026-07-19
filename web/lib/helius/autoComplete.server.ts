import 'server-only';

import { getServiceClient } from '@/lib/supabaseServer';
import {
  getActiveQuests,
  getCompletedQuestIds,
  isTxSignatureClaimedGlobally,
  recordCompletion,
  type QuestRow,
  type UserRow,
} from '@/lib/quests.server';
import { runVerification, type VerificationType } from '@/lib/solana/verify';
import { getUsedTxSignaturesForQuestType } from '@/lib/telegramCommunity';
import { MIN_FUNDED_LAMPORTS } from '@/lib/solana/programs';
import {
  formatQuestClearedMessage,
  sendTelegramMessage,
} from '@/lib/telegramNotify';
import {
  normalizeWebhookPayload,
  parseEnhancedTransaction,
  type ParsedEnhancedTx,
} from '@/lib/helius/parseEnhanced';

type Supa = ReturnType<typeof getServiceClient>;

const ONCHAIN_TYPES: VerificationType[] = [
  'wallet_funded',
  'token_swap',
  'sol_stake',
  'nft_mint',
];

/** Slugs that can trust Helius classification without an extra RPC round-trip. */
const TRUST_WEBHOOK_SLUGS = new Set(['first-swap', 'stake-sol', 'mint-nft']);

export interface AutoAwarded {
  telegramId: string;
  quest: QuestRow;
  txSignature: string;
}

async function getUserByWallet(
  supabase: Supa,
  wallet: string
): Promise<UserRow | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, telegram_id, wallet_address, points')
    .eq('wallet_address', wallet)
    .maybeSingle();
  if (error) throw error;
  return data as UserRow | null;
}

async function tryAwardQuest(params: {
  supabase: Supa;
  user: UserRow;
  quest: QuestRow;
  parsed: ParsedEnhancedTx;
}): Promise<boolean> {
  const { supabase, user, quest, parsed } = params;
  const wallet = user.wallet_address;
  if (!wallet) return false;

  const signature = parsed.signature;
  if (await isTxSignatureClaimedGlobally(supabase, signature)) {
    return false;
  }

  const type = quest.verification_type;
  let passed = false;
  let useSignature: string | null = signature;

  if (type === 'wallet_funded') {
    const inbound = parsed.nativeInByWallet.get(wallet) ?? 0;
    if (inbound >= MIN_FUNDED_LAMPORTS) {
      passed = true;
    } else {
      const result = await runVerification('wallet_funded', wallet, {
        questSlug: quest.slug,
      });
      passed = result.passed;
      useSignature = result.txSignature ?? signature;
    }
  } else if (type === 'token_swap' || type === 'sol_stake' || type === 'nft_mint') {
    const classified = parsed.candidateTypes.includes(type);
    const trustWebhook = classified && TRUST_WEBHOOK_SLUGS.has(quest.slug);

    if (trustWebhook) {
      passed = true;
    } else {
      const exclude = await getUsedTxSignaturesForQuestType(user.id, type);
      const result = await runVerification(type, wallet, {
        questSlug: quest.slug,
        telegramId: String(user.telegram_id),
        excludeTxSignatures: exclude,
      });
      passed = result.passed;
      useSignature = result.txSignature ?? signature;
    }
  }

  if (!passed) return false;

  if (useSignature && (await isTxSignatureClaimedGlobally(supabase, useSignature))) {
    return false;
  }

  const { data: fresh } = await supabase
    .from('users')
    .select('id, telegram_id, wallet_address, points')
    .eq('id', user.id)
    .single();
  const awardUser = (fresh as UserRow | null) ?? user;

  const { awarded } = await recordCompletion(supabase, {
    user: awardUser,
    quest,
    txSignature: useSignature,
  });
  return awarded;
}

async function processParsedTx(
  supabase: Supa,
  parsed: ParsedEnhancedTx,
  activeQuests: QuestRow[]
): Promise<AutoAwarded[]> {
  const awarded: AutoAwarded[] = [];

  for (const wallet of parsed.walletsInvolved) {
    let user: UserRow | null;
    try {
      user = await getUserByWallet(supabase, wallet);
    } catch (err) {
      console.warn('[helius/autoComplete] user lookup', err);
      continue;
    }
    if (!user?.wallet_address) continue;

    const completed = await getCompletedQuestIds(supabase, user.id);
    const candidates =
      parsed.candidateTypes.length > 0 ? parsed.candidateTypes : ONCHAIN_TYPES;

    const toTry = activeQuests.filter(
      (q) =>
        ONCHAIN_TYPES.includes(q.verification_type) &&
        !completed.has(q.id) &&
        candidates.includes(q.verification_type)
    );

    for (const quest of toTry) {
      try {
        const ok = await tryAwardQuest({ supabase, user, quest, parsed });
        if (ok) {
          awarded.push({
            telegramId: String(user.telegram_id),
            quest,
            txSignature: parsed.signature,
          });
          completed.add(quest.id);
        }
      } catch (err) {
        console.warn('[helius/autoComplete] award', quest.slug, err);
      }
    }
  }

  return awarded;
}

export async function processHeliusWebhookBody(body: unknown): Promise<{
  processed: number;
  awarded: AutoAwarded[];
}> {
  const supabase = getServiceClient();
  const txs = normalizeWebhookPayload(body);
  const activeQuests = await getActiveQuests(supabase);
  const allAwarded: AutoAwarded[] = [];
  let processed = 0;

  for (const raw of txs) {
    const parsed = parseEnhancedTransaction(raw);
    if (!parsed) continue;
    processed += 1;
    const batch = await processParsedTx(supabase, parsed, activeQuests);
    allAwarded.push(...batch);
  }

  for (const item of allAwarded) {
    await sendTelegramMessage(
      item.telegramId,
      formatQuestClearedMessage({
        title: item.quest.title,
        points: item.quest.points,
      })
    );
  }

  return { processed, awarded: allAwarded };
}
