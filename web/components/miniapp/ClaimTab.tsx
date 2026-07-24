'use client';

import { useCallback, useEffect, useState } from 'react';
import { CrtPanel } from '@/components/CrtPanel';
import { PixelStar } from '@/components/PixelArt';
import { isClaimsConfigured } from '@/lib/claims/distributor';
import type { TelegramWebApp } from '@/types/telegram';

interface ClaimPayload {
  epoch: {
    id: string;
    slug: string;
    merkleRoot: string;
    mint: string;
    pointsToUnits: number;
    status: string;
    publishedAt: string | null;
  } | null;
  pendingEpoch: {
    id: string;
    slug: string;
    status: string;
    publishedAt: string | null;
  } | null;
  leaf: {
    leafIndex: number;
    points: number;
    amount: string;
    walletAddress: string;
    proof: string[];
    claimedAt: string | null;
    claimTx: string | null;
  } | null;
  config: {
    mint: string | null;
    programId: string | null;
    pointsToUnits: number;
    claimsReady: boolean;
    badgeStaked?: boolean;
    stakingRequired?: boolean;
    epochFunded?: boolean;
  };
}

interface ClaimTabProps {
  telegramId: string | null;
  webApp: TelegramWebApp | null;
  haptic: (type: 'success' | 'error' | 'warning') => void;
}

function formatUnits(amount: string, pointsToUnits: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || pointsToUnits <= 0) return amount;
  return (n / pointsToUnits).toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export function ClaimTab({ telegramId, webApp, haptic }: ClaimTabProps) {
  const [data, setData] = useState<ClaimPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [txMsg, setTxMsg] = useState<string | null>(null);

  const load = useCallback(async (tg: string) => {
    try {
      setLoadError(null);
      const res = await fetch(`/api/claims?telegramId=${tg}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load claims.');
      }
      setData(await res.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load claims.');
    }
  }, []);

  useEffect(() => {
    if (!telegramId) return;
    load(telegramId);
  }, [telegramId, load]);

  const ready = isClaimsConfigured(
    data?.config.programId ?? undefined,
    data?.config.mint ?? undefined
  );

  function openTrainingGrounds() {
    const origin = window.location.origin;
    const url = `${origin}/wallet-wars/training`;
    if (webApp) {
      webApp.openLink(url);
    } else {
      window.location.href = url;
    }
  }

  async function onClaim() {
    if (!telegramId || !data?.epoch || !data.leaf || data.leaf.claimedAt) return;
    if (data.epoch.status !== 'funded') {
      setTxMsg('Epoch published — waiting for on-chain root. Check back soon.');
      haptic('warning');
      return;
    }
    if (!ready) {
      setTxMsg('Claim vault not wired yet — set CLAIM_PROGRAM_ID + CLAIM_MINT (devnet).');
      haptic('warning');
      return;
    }

    setBusy(true);
    setTxMsg(null);
    try {
      // On-chain claim path: open external claim helper when program is live.
      // Full wallet signing inside Telegram is limited; deep-link to /claim page.
      const origin = window.location.origin;
      const url = `${origin}/claim?tg=${telegramId}&epoch=${data.epoch.id}`;
      if (webApp) {
        webApp.openLink(url);
      } else {
        window.location.href = url;
      }
      haptic('success');
      setTxMsg('Opened claim flow in browser — sign with Phantom, then return here.');
    } catch (err) {
      haptic('error');
      setTxMsg(err instanceof Error ? err.message : 'Claim failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!telegramId) {
    return (
      <CrtPanel label="CLAIM // $GLEAN" tone="phosphor">
        <p className="font-term text-[16px] text-ash">
          Open GleanAI from the Telegram bot to check claim eligibility.
        </p>
      </CrtPanel>
    );
  }

  if (loadError) {
    return (
      <CrtPanel label="CLAIM // $GLEAN" tone="magenta">
        <p className="font-term text-[16px] text-magenta">{loadError}</p>
        <button type="button" onClick={() => load(telegramId)} className="chip-btn mt-3">
          Retry
        </button>
      </CrtPanel>
    );
  }

  if (!data) {
    return (
      <CrtPanel label="CLAIM // $GLEAN" tone="phosphor">
        <p className="font-term text-[17px] text-ash">Loading claim epoch…</p>
      </CrtPanel>
    );
  }

  if (!data.epoch) {
    if (data.pendingEpoch) {
      return (
        <CrtPanel label="CLAIM // $GLEAN" tone="amber">
          <p className="mb-2 font-pixel text-[10px] text-amber">EPOCH {data.pendingEpoch.slug}</p>
          <p className="font-term text-[16px] leading-snug text-ash">
            Epoch published — waiting for on-chain root. Claims unlock once the admin sets the Merkle
            root on-chain.
          </p>
        </CrtPanel>
      );
    }
    return (
      <CrtPanel label="CLAIM // $GLEAN" tone="cyan">
        <p className="font-term text-[16px] leading-snug text-ash">
          No claim epoch published yet. Keep earning points — weekly snapshots land here.
        </p>
      </CrtPanel>
    );
  }

  if (!data.leaf) {
    return (
      <CrtPanel label="CLAIM // $GLEAN" tone="amber">
        <p className="mb-2 font-pixel text-[10px] text-amber">EPOCH {data.epoch.slug}</p>
        <p className="font-term text-[16px] leading-snug text-ash">
          You are not in this week&apos;s Merkle set. Link a wallet and earn points during the
          epoch to qualify next publish.
        </p>
      </CrtPanel>
    );
  }

  const claimed = Boolean(data.leaf.claimedAt);
  const tokens = formatUnits(data.leaf.amount, data.epoch.pointsToUnits);
  const needsStake = Boolean(data.config.stakingRequired && !data.config.badgeStaked);
  const awaitingRoot = data.epoch.status !== 'funded';
  const canClaim = ready && data.config.claimsReady && !needsStake && !awaitingRoot;

  return (
    <>
      <CrtPanel label="CLAIM // $GLEAN" tone="phosphor">
        <p className="mb-1 font-pixel text-[10px] uppercase tracking-[0.14em] text-mute">
          Epoch {data.epoch.slug}
        </p>
        <div className="mb-4 flex items-center justify-center gap-2 font-pixel text-[18px] text-phosphor glow-text">
          <span className="h-4 w-4">
            <PixelStar />
          </span>
          {tokens}
        </div>
        <p className="mb-1 text-center font-term text-[14px] uppercase tracking-[0.15em] text-ash">
          claimable units
        </p>
        <p className="mb-4 text-center font-term text-[15px] text-ash">
          {data.leaf.points} pts · index {data.leaf.leafIndex}
        </p>

        {needsStake && !claimed ? (
          <div className="mb-4">
            <p className="mb-3 font-term text-[15px] leading-snug text-amber">
              Stake your Fighter Badge in Training Grounds to unlock claims.
            </p>
            <button
              type="button"
              onClick={openTrainingGrounds}
              className="arcade-btn-cyan w-full text-[10px]"
            >
              OPEN TRAINING GROUNDS
            </button>
          </div>
        ) : null}

        {awaitingRoot && !claimed && !needsStake ? (
          <p className="mb-4 font-term text-[15px] leading-snug text-amber">
            Epoch published — waiting for on-chain root. Check back soon.
          </p>
        ) : null}

        {claimed ? (
          <p className="text-center font-term text-[16px] text-phosphor">
            Claimed
            {data.leaf.claimTx ? ` · ${data.leaf.claimTx.slice(0, 8)}…` : ''}
          </p>
        ) : (
          <button
            type="button"
            onClick={onClaim}
            disabled={busy || !canClaim}
            className="arcade-btn w-full"
          >
            {busy
              ? 'Opening…'
              : needsStake
                ? 'Stake badge to unlock'
                : awaitingRoot
                  ? 'Waiting for on-chain root'
                  : ready
                    ? 'Claim tokens'
                    : 'Eligible — vault not live'}
          </button>
        )}

        {!ready && !claimed && !needsStake ? (
          <p className="mt-3 font-term text-[14px] text-mute">
            Set CLAIM_PROGRAM_ID + CLAIM_MINT (and restart the web app) to enable on-chain claim.
          </p>
        ) : null}

        {txMsg ? <p className="mt-3 font-term text-[15px] text-cyan">{txMsg}</p> : null}

        <button
          type="button"
          onClick={() => load(telegramId)}
          className="chip-btn mt-4 w-full"
        >
          Refresh
        </button>
      </CrtPanel>
    </>
  );
}
