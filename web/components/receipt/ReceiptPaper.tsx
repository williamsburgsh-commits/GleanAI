import { formatTxCount, formatUsd, shortenWallet } from '@/lib/format';
import { getMethodologyNote } from '@/lib/receipt/ethEstimate';

export interface ReceiptData {
  walletAddress: string;
  txCount: number;
  txCountCapped: boolean;
  solFeesUsd: number;
  ethEstimateUsd: number;
  savingsUsd: number;
  walletAgeDays: number;
  isFeeExtrapolated: boolean;
  networkLabel?: string;
}

interface ReceiptPaperProps {
  data: ReceiptData;
  className?: string;
}

function memberSinceLabel(days: number): string {
  if (days <= 0) return 'TODAY';
  if (days === 1) return '1 DAY AGO';
  return `${days.toLocaleString('en-US')} DAYS AGO`;
}

export function ReceiptPaper({ data, className = '' }: ReceiptPaperProps) {
  const empty = data.txCount === 0;

  return (
    <div
      className={`mx-auto max-w-sm border-2 border-[#c4b89a]/40 bg-[#f4f0e6] px-4 py-5 text-left shadow-[0_8px_0_#1a1f28] ${className}`}
      style={{ fontFamily: 'ui-monospace, monospace' }}
    >
      <p className="text-center text-[11px] tracking-widest text-[#3a3a3a]">
        ================================
      </p>
      <p className="text-center font-pixel text-[8px] tracking-wider text-[#1a1a1a]">
        GLEANAI // THE RECEIPT
      </p>
      <p className="text-center text-[11px] tracking-widest text-[#3a3a3a]">
        ================================
      </p>

      <div className="mt-4 space-y-1 text-[13px] text-[#1a1a1a]">
        <p>
          <span className="text-[#666]">WALLET:</span>{' '}
          {shortenWallet(data.walletAddress)}
        </p>
        {data.networkLabel ? (
          <p>
            <span className="text-[#666]">NETWORK:</span> {data.networkLabel}
          </p>
        ) : null}
        <p>
          <span className="text-[#666]">MEMBER SINCE:</span>{' '}
          {memberSinceLabel(data.walletAgeDays)}
        </p>
      </div>

      <p className="my-3 text-[11px] tracking-widest text-[#888]">
        --------------------------------
      </p>

      {empty ? (
        <div className="space-y-2 text-center text-[13px] text-[#1a1a1a]">
          <p className="font-pixel text-[9px] text-[#c45c00]">NO TRANSACTIONS YET</p>
          <p className="text-[12px] text-[#555]">
            Your receipt is blank. Run the Solana Sprint or complete quests to
            start your on-chain story.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 text-[13px] text-[#1a1a1a]">
          <div className="flex justify-between gap-2">
            <span className="text-[#666]">TRANSACTIONS:</span>
            <span className="font-semibold">
              {formatTxCount(data.txCount, data.txCountCapped)}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666]">SOLANA FEES:</span>
            <span className="font-semibold text-[#1a6b3c]">
              {formatUsd(data.solFeesUsd)}
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-[#666]">ETHEREUM (EST.):</span>
            <span className="font-semibold text-[#8b2e2e]">
              {formatUsd(data.ethEstimateUsd)}
            </span>
          </div>
        </div>
      )}

      {!empty && (
        <>
          <p className="my-3 text-[11px] tracking-widest text-[#888]">
            --------------------------------
          </p>
          <div className="flex justify-between gap-2 text-[14px] font-bold text-[#1a1a1a]">
            <span>YOU SAVED:</span>
            <span className="text-[#1a6b3c]">{formatUsd(data.savingsUsd)}</span>
          </div>
        </>
      )}

      <p className="mt-3 text-[11px] tracking-widest text-[#888]">
        ================================
      </p>
      <p className="text-center text-[11px] font-semibold tracking-wide text-[#1a1a1a]">
        THANK YOU FOR CHOOSING SOLANA
      </p>
      <p className="text-center text-[11px] tracking-widest text-[#888]">
        ================================
      </p>

      <p className="mt-3 text-center text-[9px] leading-snug text-[#888]">
        {getMethodologyNote()}
        {data.isFeeExtrapolated ? ' * Solana fees estimated from sample.' : ''}
      </p>
    </div>
  );
}
