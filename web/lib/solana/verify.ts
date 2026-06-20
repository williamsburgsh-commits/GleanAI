import {
  verifyWalletFunded,
  verifyTokenSwap,
  verifySolStake,
  verifyNftMint,
  type VerifyResult,
} from './verifiers';

export type VerificationType =
  | 'wallet_created'
  | 'wallet_funded'
  | 'token_swap'
  | 'sol_stake'
  | 'nft_mint'
  | 'manual';

// Runs the on-chain check for a quest's verification type.
// `manual` and `wallet_created` are not on-chain scans:
//   - wallet_created passes as soon as a wallet is linked (the caller guarantees that)
//   - manual is never auto-verified here (handled by sprint/referral/admin flows)
export async function runVerification(
  type: VerificationType,
  walletAddress: string
): Promise<VerifyResult> {
  switch (type) {
    case 'wallet_created':
      return { passed: true, detail: 'Wallet connected.' };
    case 'wallet_funded':
      return verifyWalletFunded(walletAddress);
    case 'token_swap':
      return verifyTokenSwap(walletAddress);
    case 'sol_stake':
      return verifySolStake(walletAddress);
    case 'nft_mint':
      return verifyNftMint(walletAddress);
    case 'manual':
      return {
        passed: false,
        detail: 'This quest is completed outside of on-chain verification.',
      };
    default:
      return { passed: false, detail: `Unknown verification type: ${type}` };
  }
}

export function isAutoVerifiable(type: VerificationType): boolean {
  return type !== 'manual';
}
