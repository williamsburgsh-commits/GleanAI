'use client';

import { useCallback, useEffect, useState } from 'react';
import { CrtPanel } from '@/components/CrtPanel';

interface HeliusStatus {
  helius: {
    apiKey: boolean;
    webhookId: boolean;
    webhookSecret: boolean;
  };
  claims: {
    mint: boolean;
    programId: boolean;
    authorityPubkey: boolean;
    authoritySecret: boolean;
  };
  supabase: {
    url: boolean;
    serviceRole: boolean;
  };
  telegram: {
    botToken: boolean;
  };
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: ok ? '#27ff7d' : '#ff3da6' }}
      title={ok ? 'configured' : 'missing'}
    />
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between gap-2 py-1 font-term text-[15px] text-ash">
      <span>{label}</span>
      <StatusDot ok={ok} />
    </li>
  );
}

export function HeliusPanel() {
  const [status, setStatus] = useState<HeliusStatus | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/admin/helius/status');
      if (!res.ok) throw new Error('Failed to load status.');
      setStatus(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSyncWallets() {
    setBusy(true);
    setSyncMsg(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/helius/sync-wallets', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || 'Sync failed.');
      setSyncMsg(data.detail || `Synced ${data.count ?? 0} wallet(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <CrtPanel label="HELIUS // WEBHOOKS" tone="cyan" className="mb-6">
      <p className="mb-3 font-term text-[14px] text-ash">
        Enhanced webhook URL:{' '}
        <span className="text-cyan">/api/webhooks/helius</span> · header{' '}
        <span className="text-cyan">x-helius-secret</span>
      </p>

      {status ? (
        <ul className="mb-4 border-2 border-grid px-3 py-2">
          <li className="mb-1 font-pixel text-[9px] uppercase tracking-[0.12em] text-mute">
            Helius
          </li>
          <StatusRow label="HELIUS_API_KEY" ok={status.helius.apiKey} />
          <StatusRow label="HELIUS_WEBHOOK_ID" ok={status.helius.webhookId} />
          <StatusRow label="HELIUS_WEBHOOK_SECRET" ok={status.helius.webhookSecret} />
          <li className="mb-1 mt-3 font-pixel text-[9px] uppercase tracking-[0.12em] text-mute">
            Claims / infra
          </li>
          <StatusRow label="CLAIM_MINT" ok={status.claims.mint} />
          <StatusRow label="CLAIM_PROGRAM_ID" ok={status.claims.programId} />
          <StatusRow label="CLAIM_AUTHORITY" ok={status.claims.authorityPubkey} />
          <StatusRow label="CLAIM_AUTHORITY_SECRET" ok={status.claims.authoritySecret} />
          <StatusRow label="SUPABASE_URL" ok={status.supabase.url} />
          <StatusRow label="SUPABASE_SERVICE_ROLE_KEY" ok={status.supabase.serviceRole} />
          <StatusRow label="TELEGRAM_BOT_TOKEN" ok={status.telegram.botToken} />
        </ul>
      ) : null}

      <button type="button" onClick={onSyncWallets} disabled={busy} className="arcade-btn-cyan">
        {busy ? 'Syncing…' : 'Sync all wallets to webhook'}
      </button>

      {syncMsg ? <p className="mt-3 font-term text-[15px] text-phosphor">{syncMsg}</p> : null}
      {error ? <p className="mt-3 font-term text-[15px] text-magenta">{error}</p> : null}
    </CrtPanel>
  );
}
