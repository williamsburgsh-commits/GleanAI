import { getServiceClient } from '@/lib/supabaseServer';
import { METHODOLOGY_VERSION } from './ethEstimate';

type Supa = ReturnType<typeof getServiceClient>;

export interface WalletReceiptRow {
  id: string;
  user_id: string | null;
  wallet_address: string;
  tx_count: number;
  tx_count_capped: boolean;
  sol_fees_lamports: number;
  sol_fees_usd: number;
  eth_estimate_usd: number;
  savings_usd: number;
  sol_price_usd: number;
  wallet_age_days: number;
  fee_sample_size: number;
  is_fee_extrapolated: boolean;
  methodology_version: string;
  scanned_cluster: string;
  result_card_url: string | null;
  created_at: string;
}

export function getReceiptCooldownHours(): number {
  const raw = process.env.RECEIPT_COOLDOWN_HOURS;
  const n = raw ? Number(raw) : 24;
  return Number.isFinite(n) && n > 0 ? n : 24;
}

export function canPrintReceipt(createdAt: string): {
  allowed: boolean;
  nextAt: Date | null;
} {
  const hours = getReceiptCooldownHours();
  const last = new Date(createdAt).getTime();
  const next = last + hours * 3_600_000;
  if (Date.now() >= next) return { allowed: true, nextAt: null };
  return { allowed: false, nextAt: new Date(next) };
}

export async function createReceipt(
  supabase: Supa,
  params: {
    userId: string | null;
    walletAddress: string;
    txCount: number;
    txCountCapped: boolean;
    solFeesLamports: number;
    solFeesUsd: number;
    ethEstimateUsd: number;
    savingsUsd: number;
    solPriceUsd: number;
    walletAgeDays: number;
    feeSampleSize: number;
    isFeeExtrapolated: boolean;
    scannedCluster: string;
  }
): Promise<WalletReceiptRow> {
  const { data, error } = await supabase
    .from('wallet_receipts')
    .insert({
      user_id: params.userId,
      wallet_address: params.walletAddress,
      tx_count: params.txCount,
      tx_count_capped: params.txCountCapped,
      sol_fees_lamports: params.solFeesLamports,
      sol_fees_usd: params.solFeesUsd,
      eth_estimate_usd: params.ethEstimateUsd,
      savings_usd: params.savingsUsd,
      sol_price_usd: params.solPriceUsd,
      wallet_age_days: params.walletAgeDays,
      fee_sample_size: params.feeSampleSize,
      is_fee_extrapolated: params.isFeeExtrapolated,
      methodology_version: METHODOLOGY_VERSION,
      scanned_cluster: params.scannedCluster,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as WalletReceiptRow;
}

export async function setResultCardUrl(
  supabase: Supa,
  id: string,
  url: string
): Promise<void> {
  const { error } = await supabase
    .from('wallet_receipts')
    .update({ result_card_url: url })
    .eq('id', id);
  if (error) throw error;
}

export async function getReceipt(
  supabase: Supa,
  id: string
): Promise<WalletReceiptRow | null> {
  const { data, error } = await supabase
    .from('wallet_receipts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as WalletReceiptRow | null;
}

export async function getLatestReceiptForWallet(
  supabase: Supa,
  walletAddress: string,
  scannedCluster?: string
): Promise<WalletReceiptRow | null> {
  let query = supabase
    .from('wallet_receipts')
    .select('*')
    .eq('wallet_address', walletAddress);

  if (scannedCluster) {
    query = query.eq('scanned_cluster', scannedCluster);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as WalletReceiptRow | null;
}
