'use client';

import { useCallback, useEffect, useState } from 'react';
import { CrtPanel } from '@/components/CrtPanel';

interface ClaimEpochSummary {
  id: string;
  slug: string;
  merkle_root: string;
  mint: string;
  points_to_units: number;
  total_points: number;
  total_claim_units: string;
  leaf_count: number;
  status: string;
  onchain_tx: string | null;
  published_at: string | null;
}

interface ClaimsConfig {
  mint: string | null;
  programId: string | null;
  pointsToUnits: number;
  claimsReady: boolean;
}

function shorten(hex: string, n = 8) {
  if (hex.length <= n * 2) return hex;
  return `${hex.slice(0, n)}…${hex.slice(-n)}`;
}

export function ClaimsPanel() {
  const [epochs, setEpochs] = useState<ClaimEpochSummary[]>([]);
  const [config, setConfig] = useState<ClaimsConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/admin/claims');
      if (!res.ok) throw new Error('Failed to load claims.');
      const data = await res.json();
      setEpochs(data.epochs ?? []);
      setConfig(data.config ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load claims.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onPublish() {
    if (
      !window.confirm(
        'Publish Merkle claim epoch for the previous completed week? This freezes allocations.'
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/claims/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed.');
      setMsg(`Published ${data.epoch.slug} · ${data.epoch.leaf_count} leaves.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onSetRootOnchain(id: string, slug: string) {
    if (
      !window.confirm(
        `Sign set_root on-chain for ${slug}? Requires CLAIM_AUTHORITY_SECRET on the server.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/claims/set-root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimEpochId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Set root failed.');
      if (data.alreadyFunded) {
        setMsg(`${slug} was already funded.`);
      } else {
        setMsg(`Set root for ${slug} · ${String(data.signature).slice(0, 12)}…`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Set root failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onMarkFunded(id: string) {
    const onchainTx = window.prompt('Paste set_root / fund tx signature:')?.trim();
    if (!onchainTx) return;
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/claims/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimEpochId: id, onchainTx }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not mark funded.');
      setMsg(`Marked ${data.epoch.slug} funded.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark funded.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <CrtPanel label="CLAIMS // MERKLE EPOCHS" tone="phosphor" className="mb-6">
      <p className="mb-3 font-term text-[15px] text-ash">
        Snapshot last week&apos;s points → Merkle root. Mint:{' '}
        <span className="text-cyan">
          {config?.mint ? shorten(config.mint, 6) : 'not set (CLAIM_MINT)'}
        </span>
        {' · '}
        rate{' '}
        <span className="text-phosphor">{config?.pointsToUnits?.toLocaleString() ?? '—'}</span> units /
        pt
      </p>

      <p className="mb-3 font-term text-[14px] text-mute">
        Weekly ops: (1) Publish previous week → (2) Set root on-chain → (3) Fund vault with SPL
        tokens → (4) Smoke-test claim → (5) Announce in Telegram. CLI fallback:{' '}
        <code className="text-cyan">SET_ROOT=1 node scripts/publish-claim-epoch.mjs</code>
      </p>

      <button
        type="button"
        onClick={onPublish}
        disabled={busy || !config?.mint}
        className="arcade-btn mb-4"
      >
        {busy ? 'Publishing…' : 'Publish previous week'}
      </button>

      {msg ? <p className="mb-2 font-term text-[15px] text-phosphor">{msg}</p> : null}
      {error ? <p className="mb-2 font-term text-[15px] text-magenta">{error}</p> : null}
      {!config?.mint ? (
        <p className="mb-3 font-term text-[14px] text-amber">
          Set CLAIM_MINT in env before publishing.
        </p>
      ) : null}

      {epochs.length === 0 ? (
        <p className="font-term text-[16px] text-ash">No claim epochs published yet.</p>
      ) : (
        <ul>
          {epochs.map((e, idx) => (
            <li
              key={e.id}
              className={`flex flex-wrap items-center justify-between gap-2 py-2 font-term text-[16px] ${
                idx > 0 ? 'border-t-2 border-grid' : ''
              }`}
            >
              <span className="text-bone">
                <span className="text-phosphor">{e.slug}</span>
                {' · '}
                {e.leaf_count} leaves · {e.total_points} pts
              </span>
              <span className="flex flex-wrap items-center gap-2 text-ash">
                {e.status} · root {shorten(e.merkle_root)}
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(e.merkle_root);
                    setMsg(`Copied root for ${e.slug}`);
                  }}
                  className="chip-btn"
                  title={e.merkle_root}
                >
                  copy root
                </button>
                {e.status === 'published' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onSetRootOnchain(e.id, e.slug)}
                      disabled={busy}
                      className="chip-btn"
                    >
                      set root on-chain
                    </button>
                    <button
                      type="button"
                      onClick={() => onMarkFunded(e.id)}
                      disabled={busy}
                      className="chip-btn"
                      title="Paste CLI set_root tx signature"
                    >
                      mark funded (manual)
                    </button>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </CrtPanel>
  );
}
