import { ImageResponse } from 'next/og';
import { getServiceClient } from '@/lib/supabaseServer';
import { getReceipt } from '@/lib/receipt/receipt.server';
import { formatTxCount, formatUsd } from '@/lib/format';

export const runtime = 'edge';
export const alt = 'GleanAI The Receipt';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({ params }: { params: { id: string } }) {
  let savingsLabel = '$0';
  let subline = 'PRINT YOUR SOLANA FEE RECEIPT';
  let txCount = 0;
  let capped = false;
  let solFees = 0;
  let ethEst = 0;

  try {
    const supabase = getServiceClient();
    const receipt = await getReceipt(supabase, params.id);
    if (receipt) {
      txCount = receipt.tx_count;
      capped = receipt.tx_count_capped;
      solFees = Number(receipt.sol_fees_usd);
      ethEst = Number(receipt.eth_estimate_usd);
      savingsLabel = formatUsd(Number(receipt.savings_usd));
      if (txCount > 0) {
        subline = `${formatTxCount(txCount, capped)} TXS · SOLANA ${formatUsd(solFees)} · ETH EST. ${formatUsd(ethEst)}`;
      }
    }
  } catch {
    /* fall back to placeholders */
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#05060a',
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(255,179,71,0.18), transparent 60%)',
          color: '#e7ece5',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 10,
            color: '#7d8694',
            textTransform: 'uppercase',
          }}
        >
          GleanAI // The Receipt
        </div>
        <div
          style={{
            fontSize: 48,
            marginTop: 20,
            color: '#7d8694',
            letterSpacing: 6,
          }}
        >
          YOU SAVED
        </div>
        <div
          style={{
            fontSize: txCount > 0 ? 160 : 80,
            fontWeight: 800,
            color: '#39ff7a',
            lineHeight: 1.1,
          }}
        >
          {txCount > 0 ? savingsLabel : 'ON SOLANA'}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 28,
            color: '#ffb347',
            letterSpacing: 3,
            textAlign: 'center',
            maxWidth: '90%',
          }}
        >
          {subline}
        </div>
      </div>
    ),
    { ...size }
  );
}
