import type { FighterRarity } from '@/lib/wallet-wars/rarity';
import { lookupKol } from '@/lib/wallet-wars/kolRegistry';

export interface FighterAvatarInput {
  walletAddress?: string | null;
  strike: number;
  shield: number;
  power: number;
  armor: number;
  agility: number;
  rarity: FighterRarity | string;
}

function dicebearSvg(seed: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;
}

function dicebearPng(seed: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(seed)}`;
}

/** SVG avatar for cards / battles. KOL wallets use static boss art. */
export function resolveFighterAvatar(input: FighterAvatarInput): string {
  const kol = lookupKol(input.walletAddress ?? undefined);
  if (kol) return kol.avatarSvg;
  const seed = input.walletAddress?.trim() || 'glean-fighter';
  return dicebearSvg(seed);
}

/** PNG avatar for Metaplex / wallet galleries. */
export function resolveFighterAvatarPng(input: FighterAvatarInput): string {
  const kol = lookupKol(input.walletAddress ?? undefined);
  if (kol) return kol.avatarPng;
  const seed = input.walletAddress?.trim() || 'glean-fighter';
  return dicebearPng(seed);
}

/** @deprecated Use resolveFighterAvatar — kept for call-site migration. */
export function fighterAvatarUrl(walletAddress: string): string {
  return dicebearSvg(walletAddress);
}

/** @deprecated Use resolveFighterAvatarPng */
export function fighterAvatarPngUrl(walletAddress: string): string {
  return dicebearPng(walletAddress);
}

/** Bot avatars use DiceBear seeded by bot id. */
export function botAvatarUrl(botSeed: string): string {
  return dicebearSvg(`bot-${botSeed}`);
}
