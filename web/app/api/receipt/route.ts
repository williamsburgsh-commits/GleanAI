import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getServiceClient } from '@/lib/supabaseServer';
import { fetchReceiptData } from '@/lib/receipt/fetchReceiptData';
import { estimateEthFeesUsd } from '@/lib/receipt/ethEstimate';
import { fetchSolPriceUsd } from '@/lib/receipt/solPrice';
import {
  canPrintReceipt,
  createReceipt,
  getLatestReceiptForWallet,
  setResultCardUrl,
} from '@/lib/receipt/receipt.server';
import { getOrCreateUserByTelegramId } from '@/lib/users.server';
import { getQuestBySlug, recordCompletion } from '@/lib/quests.server';

export const runtime = 'nodejs';
export const maxDuration = 60;

function isValidSolanaAddress(address: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

function receiptPayload(row: {
  id: string;
  result_card_url: string | null;
  tx_count: number;
  savings_usd: number;
  eth_estimate_usd: number;
  sol_fees_usd: number;
  tx_count_capped: boolean;
  wallet_age_days?: number;
  is_fee_extrapolated?: boolean;
}) {
  const origin =
    process.env.NEXT_PUBLIC_WEB_APP_URL?.replace(/\/$/, '') ||
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : '';
  const resultUrl =
    row.result_card_url || `${origin}/receipt/result/${row.id}`;

  return {
    receiptId: row.id,
    resultUrl,
    txCount: row.tx_count,
    txCountCapped: row.tx_count_capped,
    solFeesUsd: Number(row.sol_fees_usd),
    ethEstimateUsd: Number(row.eth_estimate_usd),
    savingsUsd: Number(row.savings_usd),
    walletAgeDays: row.wallet_age_days ?? 0,
    isFeeExtrapolated: row.is_fee_extrapolated ?? false,
  };
}

async function resolveUserId(
  supabase: ReturnType<typeof getServiceClient>,
  walletAddress: string,
  telegramId?: string
): Promise<string | null> {
  if (telegramId && /^\d+$/.test(telegramId)) {
    const user = await getOrCreateUserByTelegramId(supabase, telegramId);
    return user.id;
  }

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('wallet_address', walletAddress)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function creditReceiptQuest(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string
): Promise<void> {
  const quest = await getQuestBySlug(supabase, 'print-receipt');
  if (!quest) return;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, telegram_id, wallet_address, points')
    .eq('id', userId)
    .single();
  if (error || !user) return;

  try {
    await recordCompletion(supabase, { user, quest });
  } catch (err) {
    console.error('[api/receipt] quest credit failed', err);
  }
}

// GET /api/receipt?walletAddress=...
export async function GET(request: Request) {
  const walletAddress =
    new URL(request.url).searchParams.get('walletAddress')?.trim() ?? '';
  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json(
      { error: 'A valid walletAddress query param is required.' },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch {
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const latest = await getLatestReceiptForWallet(supabase, walletAddress);
    if (!latest) {
      return NextResponse.json({ receipt: null });
    }
    return NextResponse.json({
      receipt: receiptPayload(latest),
      createdAt: latest.created_at,
    });
  } catch (err) {
    console.error('[api/receipt] GET error', err);
    return NextResponse.json({ error: 'Could not load receipt.' }, { status: 500 });
  }
}

// POST /api/receipt { walletAddress, telegramId? }
export async function POST(request: Request) {
  let body: { walletAddress?: string; telegramId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const walletAddress = (body.walletAddress || '').trim();
  const telegramId = (body.telegramId || '').toString().trim();

  if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
    return NextResponse.json(
      { error: 'A valid walletAddress is required.' },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch {
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const latest = await getLatestReceiptForWallet(supabase, walletAddress);
    if (latest) {
      const cooldown = canPrintReceipt(latest.created_at);
      if (!cooldown.allowed) {
        return NextResponse.json({
          ...receiptPayload(latest),
          cached: true,
          nextPrintAt: cooldown.nextAt?.toISOString() ?? null,
        });
      }
    }

    const scan = await fetchReceiptData(walletAddress);
    const solPriceUsd = await fetchSolPriceUsd();
    const solFeesUsd = (scan.solFeesLamports / 1e9) * solPriceUsd;
    const ethEstimateUsd = estimateEthFeesUsd(scan.txCount);
    const savingsUsd = Math.max(0, ethEstimateUsd - solFeesUsd);

    const userId = await resolveUserId(supabase, walletAddress, telegramId || undefined);

    const receipt = await createReceipt(supabase, {
      userId,
      walletAddress,
      txCount: scan.txCount,
      txCountCapped: scan.txCountCapped,
      solFeesLamports: scan.solFeesLamports,
      solFeesUsd,
      ethEstimateUsd,
      savingsUsd,
      solPriceUsd,
      walletAgeDays: scan.walletAgeDays,
      feeSampleSize: scan.feeSampleSize,
      isFeeExtrapolated: scan.isFeeExtrapolated,
    });

    const origin = new URL(request.url).origin;
    const resultUrl = `${origin}/receipt/result/${receipt.id}`;
    try {
      await setResultCardUrl(supabase, receipt.id, resultUrl);
    } catch (err) {
      console.error('[api/receipt] could not store result url', err);
    }

    if (userId) {
      await creditReceiptQuest(supabase, userId);
    }

    return NextResponse.json({
      ...receiptPayload({ ...receipt, result_card_url: resultUrl }),
      cached: false,
    });
  } catch (err) {
    console.error('[api/receipt] POST error', err);
    const message =
      err instanceof Error ? err.message : 'Could not print your receipt.';
    const isMissingTable =
      typeof message === 'string' &&
      /wallet_receipts|relation.*does not exist/i.test(message);
    return NextResponse.json(
      {
        error: isMissingTable
          ? 'Receipt database not ready. Run migration 0005_wallet_receipts.sql in Supabase.'
          : message.includes('fetch') || message.includes('429')
            ? 'On-chain scan timed out. Try again in a moment.'
            : 'Could not print your receipt. Try again.',
      },
      { status: 502 }
    );
  }
}
