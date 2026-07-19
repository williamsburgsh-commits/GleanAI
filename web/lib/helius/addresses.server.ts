import 'server-only';

interface HeliusWebhook {
  webhookID: string;
  webhookURL: string;
  transactionTypes?: string[];
  accountAddresses?: string[];
  webhookType?: string;
  authHeader?: string;
  txnStatus?: string;
}

function heliusConfig(): { apiKey: string; webhookId: string } | null {
  const apiKey = process.env.HELIUS_API_KEY?.trim();
  const webhookId = process.env.HELIUS_WEBHOOK_ID?.trim();
  if (!apiKey || !webhookId) return null;
  return { apiKey, webhookId };
}

async function getWebhook(
  apiKey: string,
  webhookId: string
): Promise<HeliusWebhook | null> {
  const url = `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${apiKey}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    console.warn('[helius] getWebhook', res.status, await res.text().catch(() => ''));
    return null;
  }
  return (await res.json()) as HeliusWebhook;
}

async function putWebhook(
  apiKey: string,
  webhookId: string,
  webhook: HeliusWebhook,
  accountAddresses: string[]
): Promise<boolean> {
  const url = `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${apiKey}`;
  const body: Record<string, unknown> = {
    webhookURL: webhook.webhookURL,
    accountAddresses,
    webhookType: webhook.webhookType ?? 'enhanced',
    transactionTypes: webhook.transactionTypes ?? ['ANY'],
  };
  if (webhook.authHeader) body.authHeader = webhook.authHeader;
  if (webhook.txnStatus) body.txnStatus = webhook.txnStatus;

  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.warn('[helius] putWebhook', res.status, await res.text().catch(() => ''));
    return false;
  }
  return true;
}

/** Best-effort: append addresses to the Helius webhook watch list. */
export async function addWebhookAddresses(addresses: string[]): Promise<void> {
  const cfg = heliusConfig();
  if (!cfg) {
    console.warn('[helius] skip addWebhookAddresses — HELIUS_API_KEY / HELIUS_WEBHOOK_ID unset');
    return;
  }
  const unique = [...new Set(addresses.map((a) => a.trim()).filter(Boolean))];
  if (!unique.length) return;

  try {
    const webhook = await getWebhook(cfg.apiKey, cfg.webhookId);
    if (!webhook) return;
    const current = new Set(webhook.accountAddresses ?? []);
    let changed = false;
    for (const addr of unique) {
      if (!current.has(addr)) {
        current.add(addr);
        changed = true;
      }
    }
    if (!changed) return;
    await putWebhook(cfg.apiKey, cfg.webhookId, webhook, [...current]);
  } catch (err) {
    console.warn('[helius] addWebhookAddresses', err);
  }
}

/** Best-effort: remove addresses from the Helius webhook watch list. */
export async function removeWebhookAddresses(addresses: string[]): Promise<void> {
  const cfg = heliusConfig();
  if (!cfg) {
    console.warn('[helius] skip removeWebhookAddresses — HELIUS_API_KEY / HELIUS_WEBHOOK_ID unset');
    return;
  }
  const remove = new Set(addresses.map((a) => a.trim()).filter(Boolean));
  if (!remove.size) return;

  try {
    const webhook = await getWebhook(cfg.apiKey, cfg.webhookId);
    if (!webhook) return;
    const next = (webhook.accountAddresses ?? []).filter((a) => !remove.has(a));
    if (next.length === (webhook.accountAddresses ?? []).length) return;
    await putWebhook(cfg.apiKey, cfg.webhookId, webhook, next);
  } catch (err) {
    console.warn('[helius] removeWebhookAddresses', err);
  }
}

/** Replace webhook addresses with the full provided list (admin sync). */
export async function syncWebhookAddresses(addresses: string[]): Promise<{
  ok: boolean;
  count: number;
  detail: string;
}> {
  const cfg = heliusConfig();
  if (!cfg) {
    return {
      ok: false,
      count: 0,
      detail: 'HELIUS_API_KEY / HELIUS_WEBHOOK_ID not configured.',
    };
  }
  const unique = [...new Set(addresses.map((a) => a.trim()).filter(Boolean))];
  try {
    const webhook = await getWebhook(cfg.apiKey, cfg.webhookId);
    if (!webhook) {
      return { ok: false, count: 0, detail: 'Could not load Helius webhook.' };
    }
    const ok = await putWebhook(cfg.apiKey, cfg.webhookId, webhook, unique);
    return {
      ok,
      count: unique.length,
      detail: ok
        ? `Synced ${unique.length} wallet address(es).`
        : 'Helius webhook update failed.',
    };
  } catch (err) {
    console.warn('[helius] syncWebhookAddresses', err);
    return {
      ok: false,
      count: 0,
      detail: err instanceof Error ? err.message : 'Sync failed.',
    };
  }
}
