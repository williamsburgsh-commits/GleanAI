import {
  verifyWalletFunded,
  verifyTokenSwap,
  verifySecondTokenSwap,
  verifySolStake,
  verifySecondSolStake,
  verifyNftMint,
  verifyGleanFighterBadge,
  type VerifyResult,
} from './verifiers';
import { verifyTelegramCommunityMember } from '@/lib/telegramCommunity';

export type VerificationType =
  | 'wallet_created'
  | 'wallet_funded'
  | 'token_swap'
  | 'sol_stake'
  | 'nft_mint'
  | 'manual';

export interface VerificationContext {
  questSlug?: string;
  telegramId?: string;
  excludeTxSignatures?: Set<string>;
}

export async function runVerification(
  type: VerificationType,
  walletAddress: string,
  ctx: VerificationContext = {}
): Promise<VerifyResult> {
  const exclude = ctx.excludeTxSignatures ?? new Set<string>();
  const slug = ctx.questSlug ?? '';

  switch (type) {
    case 'wallet_created':
      return { passed: true, detail: 'Wallet connected.' };
    case 'wallet_funded':
      return verifyWalletFunded(walletAddress);
    case 'token_swap':
      if (slug === 'swap-again') {
        return verifySecondTokenSwap(walletAddress, undefined, exclude);
      }
      return verifyTokenSwap(walletAddress, undefined, exclude);
    case 'sol_stake':
      if (slug === 'stake-more') {
        return verifySecondSolStake(walletAddress, undefined, exclude);
      }
      return verifySolStake(walletAddress, undefined, exclude);
    case 'nft_mint':
      if (slug === 'mint-fighter-badge') {
        return verifyGleanFighterBadge(walletAddress);
      }
      return verifyNftMint(walletAddress, undefined, exclude);
    case 'manual':
      if (slug === 'join-community' && ctx.telegramId) {
        return verifyTelegramCommunityMember(ctx.telegramId);
      }
      return {
        passed: false,
        detail: 'This quest is completed outside of on-chain verification.',
      };
    default:
      return { passed: false, detail: `Unknown verification type: ${type}` };
  }
}

export function isAutoVerifiable(type: VerificationType, questSlug?: string): boolean {
  if (type !== 'manual') return true;
  return questSlug === 'join-community';
}
