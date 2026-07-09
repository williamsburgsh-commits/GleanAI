// Formats a millisecond duration as seconds with two decimals, e.g. "11.42s".
export function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

// A short human phrase for the result card, e.g. "Onboarded in 11.42 seconds".
export function onboardedPhrase(ms: number): string {
  return `Onboarded in ${(ms / 1000).toFixed(2)} seconds`;
}

export function formatUsd(amount: number): string {
  if (amount >= 1000) {
    return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  if (amount >= 1) {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

export function formatTxCount(count: number, capped: boolean): string {
  if (capped) return `${count.toLocaleString('en-US')}+`;
  return count.toLocaleString('en-US');
}

export function shortenWallet(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function buildReceiptShareText(params: {
  txCount: number;
  txCountCapped: boolean;
  solFeesUsd: number;
  ethEstimateUsd: number;
  savingsUsd: number;
}): string {
  const txs = formatTxCount(params.txCount, params.txCountCapped);
  if (params.txCount === 0) {
    return 'Just printed my Solana receipt on GleanAI — my on-chain story starts now.';
  }
  return (
    `${txs} transactions on Solana.\n` +
    `Fees: ${formatUsd(params.solFeesUsd)} vs ${formatUsd(params.ethEstimateUsd)} on ETH (est.)\n` +
    `I saved ${formatUsd(params.savingsUsd)}.`
  );
}
