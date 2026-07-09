export const METHODOLOGY_VERSION = 'v1';

/** Blended average per Ethereum transaction (simple transfer baseline). */
const ETH_AVG_FEE_USD = 4.5;

export function estimateEthFeesUsd(txCount: number): number {
  return txCount * ETH_AVG_FEE_USD;
}

export function getMethodologyNote(): string {
  return `Ethereum estimate uses $${ETH_AVG_FEE_USD.toFixed(2)}/tx blended average. Solana fees are summed from on-chain data. Estimates only.`;
}
