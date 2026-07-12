import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import {
  getUserByTelegramId,
  getQuestBySlug,
  recordCompletion,
  isTxSignatureClaimedGlobally,
} from '@/lib/quests.server';
import { runVerification } from '@/lib/solana/verify';
import { getUsedTxSignaturesForQuestType } from '@/lib/telegramCommunity';

export const runtime = 'nodejs';

// POST /api/quests/verify  { telegramId, questSlug }
// Runs the quest's on-chain verification and, on success, records the
// completion and awards points.
export async function POST(request: Request) {
  let body: { telegramId?: string; questSlug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  const questSlug = (body.questSlug || '').toString().trim();

  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json(
      { error: 'A valid telegramId is required.' },
      { status: 400 }
    );
  }
  if (!questSlug) {
    return NextResponse.json({ error: 'questSlug is required.' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('[api/quests/verify] config error', err);
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const [user, quest] = await Promise.all([
      getUserByTelegramId(supabase, telegramId),
      getQuestBySlug(supabase, questSlug),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Connect your wallet first.' },
        { status: 404 }
      );
    }
    if (!quest) {
      return NextResponse.json({ error: 'Quest not found.' }, { status: 404 });
    }
    if (!user.wallet_address) {
      return NextResponse.json(
        { error: 'Link a wallet before verifying quests.' },
        { status: 400 }
      );
    }

    // Run the on-chain check (or quick pass for wallet_created).
    let result;
    try {
      const excludeTxSignatures = ['token_swap', 'sol_stake', 'nft_mint'].includes(
        quest.verification_type
      )
        ? await getUsedTxSignaturesForQuestType(user.id, quest.verification_type)
        : new Set<string>();

      result = await runVerification(quest.verification_type, user.wallet_address, {
        questSlug: quest.slug,
        telegramId,
        excludeTxSignatures,
      });
    } catch (err) {
      console.error('[api/quests/verify] on-chain error', err);
      return NextResponse.json(
        { error: 'On-chain verification failed. Please try again shortly.' },
        { status: 502 }
      );
    }

    if (!result.passed) {
      return NextResponse.json({
        passed: false,
        awarded: false,
        detail: result.detail,
      });
    }

    if (result.txSignature) {
      const claimed = await isTxSignatureClaimedGlobally(supabase, result.txSignature);
      if (claimed) {
        return NextResponse.json({
          passed: false,
          awarded: false,
          detail: 'This transaction was already used for a quest.',
        });
      }
    }

    const { awarded } = await recordCompletion(supabase, {
      user,
      quest,
      txSignature: result.txSignature,
    });

    return NextResponse.json({
      passed: true,
      awarded,
      pointsAwarded: awarded ? quest.points : 0,
      detail: awarded
        ? `Quest complete! +${quest.points} points.`
        : 'Already completed.',
    });
  } catch (err) {
    console.error('[api/quests/verify] error', err);
    return NextResponse.json(
      { error: 'Could not verify the quest. Please try again.' },
      { status: 500 }
    );
  }
}
