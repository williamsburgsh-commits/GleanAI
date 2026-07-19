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

function clampStat(n: number): number {
  return Math.min(150, Math.max(0, Math.round(Number(n) || 0)));
}

function traitQuery(input: FighterAvatarInput): string {
  const params = new URLSearchParams({
    rarity: String(input.rarity || 'common'),
    strike: String(clampStat(input.strike)),
    shield: String(clampStat(input.shield)),
    power: String(clampStat(input.power)),
    armor: String(clampStat(input.armor)),
    agility: String(clampStat(input.agility)),
  });
  return params.toString();
}

/** SVG avatar for cards / battles. KOL wallets use static boss art. */
export function resolveFighterAvatar(input: FighterAvatarInput): string {
  const kol = lookupKol(input.walletAddress ?? undefined);
  if (kol) return kol.avatarSvg;
  return `/api/fighter-avatar?${traitQuery(input)}`;
}

/** PNG avatar for Metaplex / wallet galleries. */
export function resolveFighterAvatarPng(input: FighterAvatarInput): string {
  const kol = lookupKol(input.walletAddress ?? undefined);
  if (kol) return kol.avatarPng;
  return `/api/fighter-avatar?${traitQuery(input)}&format=png`;
}

/** @deprecated Use resolveFighterAvatar — kept for call-site migration. */
export function fighterAvatarUrl(walletAddress: string): string {
  return resolveFighterAvatar({
    walletAddress,
    strike: 40,
    shield: 40,
    power: 40,
    armor: 40,
    agility: 40,
    rarity: 'common',
  });
}

/** @deprecated Use resolveFighterAvatarPng */
export function fighterAvatarPngUrl(walletAddress: string): string {
  return resolveFighterAvatarPng({
    walletAddress,
    strike: 40,
    shield: 40,
    power: 40,
    armor: 40,
    agility: 40,
    rarity: 'common',
  });
}

/** Bot avatars are trait-composed from their stats (no DiceBear). */
export function botAvatarUrl(stats: FighterAvatarInput): string {
  return resolveFighterAvatar({ ...stats, walletAddress: null });
}
