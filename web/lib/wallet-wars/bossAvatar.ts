import { isBossSlug, type BossSlug } from '@/lib/wallet-wars/bosses';

/** Static pixel portrait served from /public/bosses/{slug}.svg */
export function bossAvatarUrl(slug: string): string {
  if (isBossSlug(slug)) return `/bosses/${slug}.svg`;
  return `/bosses/gatekeeper.svg`;
}

export function bossAvatarUrlTyped(slug: BossSlug): string {
  return `/bosses/${slug}.svg`;
}
