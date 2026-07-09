import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CrtPanel } from '@/components/CrtPanel';
import { ShareButton } from '@/components/ShareButton';
import { ReceiptPaper } from '@/components/receipt/ReceiptPaper';
import { getServiceClient } from '@/lib/supabaseServer';
import { getReceipt } from '@/lib/receipt/receipt.server';
import { buildReceiptShareText, formatUsd } from '@/lib/format';
import { clusterLabel, normalizeCluster } from '@/lib/solana/cluster';

export const runtime = 'nodejs';

async function loadReceipt(id: string) {
  try {
    const supabase = getServiceClient();
    return await getReceipt(supabase, id);
  } catch (err) {
    console.error('[receipt/result] load error', err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const receipt = await loadReceipt(params.id);
  if (!receipt) {
    return { title: 'GleanAI // The Receipt' };
  }

  const savings = Number(receipt.savings_usd);
  const title =
    receipt.tx_count > 0
      ? `I saved ${formatUsd(savings)} in fees on Solana`
      : 'My Solana Receipt — GleanAI';

  return {
    title: `${title} - GleanAI`,
    description: 'Print your lifetime Solana fee receipt on GleanAI.',
    openGraph: {
      title,
      description: 'Real on-chain fees vs Ethereum estimate.',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: 'Real on-chain fees vs Ethereum estimate.',
    },
  };
}

export default async function ReceiptResult({
  params,
}: {
  params: { id: string };
}) {
  const receipt = await loadReceipt(params.id);
  if (!receipt) notFound();

  const shareUrl = receipt.result_card_url || '';
  const shareText = buildReceiptShareText({
    txCount: receipt.tx_count,
    txCountCapped: receipt.tx_count_capped,
    solFeesUsd: Number(receipt.sol_fees_usd),
    ethEstimateUsd: Number(receipt.eth_estimate_usd),
    savingsUsd: Number(receipt.savings_usd),
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <CrtPanel label="THE RECEIPT // RESULT" tone="amber">
        <div className="space-y-6 py-4">
          <ReceiptPaper
            data={{
              walletAddress: receipt.wallet_address,
              txCount: receipt.tx_count,
              txCountCapped: receipt.tx_count_capped,
              solFeesUsd: Number(receipt.sol_fees_usd),
              ethEstimateUsd: Number(receipt.eth_estimate_usd),
              savingsUsd: Number(receipt.savings_usd),
              walletAgeDays: receipt.wallet_age_days,
              isFeeExtrapolated: receipt.is_fee_extrapolated,
              networkLabel: clusterLabel(
                normalizeCluster(receipt.scanned_cluster ?? 'mainnet-beta')
              ),
            }}
          />

          <div className="flex flex-wrap items-center justify-center gap-4">
            <ShareButton
              url={shareUrl}
              text={shareText}
              twitterText={`${shareText}\n${shareUrl}`}
            />
            <Link
              href="/receipt"
              className="font-term text-[16px] uppercase tracking-[0.1em] text-cyan underline"
            >
              print your own
            </Link>
            <Link
              href="/play"
              className="font-term text-[16px] uppercase tracking-[0.1em] text-ash underline"
            >
              enter arcade
            </Link>
          </div>
        </div>
      </CrtPanel>

      <p className="mt-6 text-center font-term text-[14px] uppercase tracking-[0.2em] text-ash">
        gleanai · the receipt
      </p>
    </main>
  );
}
