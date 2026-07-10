import { getTelegramId, rememberTelegramId } from '@/lib/phantom';

/** Read ?tg= from the URL and persist it for later pages (e.g. /play after wallet connect). */
export function captureTelegramIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  // Battle invite URLs must not adopt the creator's ?tg= as the visitor's identity.
  if (params.get('invite')) return null;
  const param = params.get('tg');
  if (param && /^\d+$/.test(param)) {
    rememberTelegramId(param);
    return param;
  }
  return null;
}

/** Resolve the player's Telegram id from URL, local storage, or a linked wallet lookup. */
export async function resolveTelegramId(walletAddress?: string | null): Promise<string | null> {
  const fromUrl = captureTelegramIdFromUrl();
  if (fromUrl) return fromUrl;

  const stored = getTelegramId();
  if (stored) return stored;

  if (!walletAddress) return null;

  try {
    const res = await fetch(
      `/api/wallet?walletAddress=${encodeURIComponent(walletAddress)}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { telegramId?: string | number };
    if (data.telegramId) {
      const id = String(data.telegramId);
      rememberTelegramId(id);
      return id;
    }
  } catch {
    /* non-critical */
  }

  return null;
}
