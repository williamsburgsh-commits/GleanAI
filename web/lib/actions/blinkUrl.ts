import { getPublicWebAppUrl } from '@/lib/publicWebAppUrl';

/**
 * dial.to interstitial so Blinks work on X/wallets before Dialect registry.
 * `actionApiPath` is a path like `/api/actions/ghost-race` or a full Action URL.
 */
export function toDialToActionUrl(actionApiPath: string): string {
  const base = getPublicWebAppUrl();
  const absolute = actionApiPath.startsWith('http')
    ? actionApiPath
    : `${base}${actionApiPath.startsWith('/') ? '' : '/'}${actionApiPath}`;
  return `https://dial.to/?action=${encodeURIComponent(`solana-action:${absolute}`)}`;
}

export function ghostRaceBlinkUrl(): string {
  return toDialToActionUrl('/api/actions/ghost-race');
}

export function bossChallengeBlinkUrl(bossSlug = 'gatekeeper'): string {
  const q = bossSlug && bossSlug !== 'gatekeeper' ? `?boss=${encodeURIComponent(bossSlug)}` : '';
  return toDialToActionUrl(`/api/actions/boss-challenge${q}`);
}
