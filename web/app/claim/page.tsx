'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PublicKey, Transaction } from '@solana/web3.js';
import { BrandMark } from '@/components/BrandMark';
import { CrtPanel } from '@/components/CrtPanel';
import { buildClaimIx, isClaimsConfigured } from '@/lib/claims/distributor';
import { getPhantomProvider } from '@/lib/phantom';
import {
  serializeTransactionBase64,
  walletErrorMessage,
} from '@/lib/solana/walletErrors';

interface ClaimPayload {
  epoch: {
    id: string;
    slug: string;
    merkleRoot: string;
    mint: string;
    pointsToUnits: number;
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
    claimsReady: boolean;
    badgeStaked?: boolean;
    stakingRequired?: boolean;
  };
}

function ClaimClient() {
  const params = useSearchParams();
  const telegramId = params.get('tg')?.trim() ?? '';
  const [data, setData] = useState<ClaimPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!telegramId || !/^\d+$/.test(telegramId)) {
      setError('Open this page from the Mini App Claim tab.');
      return;
    }
    try {
      setError(null);
      const res = await fetch(`/api/claims?telegramId=${telegramId}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load claim.');
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load claim.');
    }
  }, [telegramId]);

  useEffect(() => {
    load();
  }, [load]);

  async function onClaim() {
    if (!data?.epoch || !data.leaf || data.leaf.claimedAt) return;
    const programIdStr = data.config.programId;
    const mintStr = data.config.mint || data.epoch.mint;
    if (!isClaimsConfigured(programIdStr, mintStr)) {
      setError('CLAIM_PROGRAM_ID / CLAIM_MINT not configured.');
      return;
    }

    const provider = getPhantomProvider();
    if (!provider) {
      setError('Install Phantom (desktop) to sign the claim transaction.');
      return;
    }

    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const connected = await provider.connect();
      const claimant = new PublicKey(connected.publicKey.toBase58());

      if (claimant.toBase58() !== data.leaf.walletAddress) {
        throw new Error(
          `Connected wallet ${claimant.toBase58().slice(0, 8)}… does not match claim leaf.`
        );
      }

      const programId = new PublicKey(programIdStr!);
      const mint = new PublicKey(mintStr!);
      const ix = buildClaimIx({
        programId,
        mint,
        claimant,
        index: data.leaf.leafIndex,
        amount: BigInt(data.leaf.amount),
        proof: data.leaf.proof,
      });

      // Public Solana RPCs often 403 from the browser — fetch blockhash server-side.
      const bhRes = await fetch('/api/solana/blockhash', { cache: 'no-store' });
      const bhBody = await bhRes.json();
      if (!bhRes.ok) {
        throw new Error(bhBody.error || 'Could not fetch blockhash.');
      }
      const { blockhash, lastValidBlockHeight } = bhBody as {
        blockhash: string;
        lastValidBlockHeight: number;
      };

      const tx = new Transaction({
        feePayer: claimant,
        blockhash,
        lastValidBlockHeight,
      }).add(ix);

      // Phantom sign only; Alchemy broadcasts (avoids public RPC 403 / "Unexpected error").
      if (typeof provider.signTransaction !== 'function') {
        throw new Error('Phantom signTransaction is unavailable. Update Phantom and retry.');
      }
      const signed = await provider.signTransaction(tx);
      const sendRes = await fetch('/api/solana/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: serializeTransactionBase64(signed) }),
      });
      const sendBody = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok) {
        throw new Error(sendBody.error || 'Could not broadcast claim transaction.');
      }
      const sig = String(sendBody.signature);

      const confirmRes = await fetch('/api/claims/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: sig, blockhash, lastValidBlockHeight }),
      });
      const confirmBody = await confirmRes.json().catch(() => ({}));
      const confirmHardFail =
        confirmRes.status >= 400 &&
        confirmRes.status !== 202 &&
        !confirmBody.pending;

      const markRes = await fetch('/api/claims/mark-claimed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId,
          claimEpochId: data.epoch.id,
          claimTx: sig,
        }),
      });
      const markBody = await markRes.json().catch(() => ({}));

      if (!markRes.ok) {
        if (confirmHardFail) {
          throw new Error(confirmBody.error || 'Transaction sent but confirmation failed.');
        }
        throw new Error(
          markBody.error ||
            `Claim likely succeeded (${sig.slice(0, 8)}…) but site sync lagged. Refresh in a moment.`
        );
      }

      setMsg(`Claimed · ${sig.slice(0, 12)}…`);
      await load();
    } catch (err) {
      setError(walletErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-4 py-6">
      <BrandMark href="/app" />
      <CrtPanel label="CLAIM // SIGN" tone="phosphor">
        {error ? <p className="mb-3 font-term text-[16px] text-magenta">{error}</p> : null}
        {msg ? <p className="mb-3 font-term text-[16px] text-phosphor">{msg}</p> : null}
        {!data && !error ? (
          <p className="font-term text-[16px] text-ash">Loading…</p>
        ) : null}
        {data?.epoch && data.leaf ? (
          <>
            <p className="mb-2 font-pixel text-[10px] text-mute">EPOCH {data.epoch.slug}</p>
            <p className="mb-4 font-term text-[17px] text-bone">
              {data.leaf.amount} units · index {data.leaf.leafIndex}
            </p>
            {data.leaf.claimedAt ? (
              <p className="font-term text-[16px] text-phosphor">Already claimed.</p>
            ) : data.config.stakingRequired && !data.config.badgeStaked ? (
              <div>
                <p className="mb-3 font-term text-[16px] text-amber">
                  Stake your Fighter Badge in Training Grounds to unlock claims.
                </p>
                <a
                  href="/wallet-wars/training"
                  className="arcade-btn-cyan inline-block w-full text-center text-[10px]"
                >
                  OPEN TRAINING GROUNDS
                </a>
              </div>
            ) : (
              <button
                type="button"
                onClick={onClaim}
                disabled={busy || !data.config.claimsReady}
                className="arcade-btn w-full"
              >
                {busy ? 'Signing…' : 'Sign claim with Phantom'}
              </button>
            )}
          </>
        ) : data && !data.leaf ? (
          <p className="font-term text-[16px] text-ash">No claim leaf for this account.</p>
        ) : null}
      </CrtPanel>
      <p className="font-term text-xs text-ash">
        Phantom must be on Devnet. If signing fails in Telegram, open this page in an external
        browser with Phantom connected.
      </p>
    </main>
  );
}

export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
          <p className="font-pixel text-[11px] text-phosphor">LOADING…</p>
        </main>
      }
    >
      <ClaimClient />
    </Suspense>
  );
}
