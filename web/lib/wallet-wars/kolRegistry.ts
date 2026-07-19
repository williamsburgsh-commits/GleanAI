import { BOSSES, type BossSlug } from '@/lib/wallet-wars/bosses';

export interface KolEntry {
  slug: BossSlug;
  name: string;
  walletAddress: string;
  avatarSvg: string;
  avatarPng: string;
}

const KOL_BY_WALLET: Map<string, KolEntry> = (() => {
  const map = new Map<string, KolEntry>();
  for (const slug of Object.keys(BOSSES) as BossSlug[]) {
    const boss = BOSSES[slug];
    if (!boss.walletAddress) continue;
    map.set(boss.walletAddress, {
      slug,
      name: boss.name,
      walletAddress: boss.walletAddress,
      avatarSvg: `/bosses/${slug}.svg`,
      avatarPng: `/bosses/${slug}.png`,
    });
  }
  return map;
})();

export function lookupKol(walletAddress: string | null | undefined): KolEntry | null {
  if (!walletAddress) return null;
  return KOL_BY_WALLET.get(walletAddress) ?? null;
}

export function isKolWallet(walletAddress: string | null | undefined): boolean {
  return lookupKol(walletAddress) !== null;
}
