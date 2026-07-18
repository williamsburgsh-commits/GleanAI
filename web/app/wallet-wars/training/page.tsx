'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Transaction } from '@solana/web3.js';
import { CrtPanel } from '@/components/CrtPanel';
import { useTelegram } from '@/components/TelegramProvider';
import { getPhantomProvider, getTelegramId } from '@/lib/phantom';
import { getPublicConfig } from '@/lib/config';
import { PixelArrowLeft } from '@/components/PixelArt';

interface TrainingStatus {
  badgeMint: string | null;
  staked: boolean;
  stakedAt: string | null;
  unstakedAt: string | null;
  epochsClaimed: number;
  trainingPowerBonus: number;
  pendingEpochs: number;
  pendingPower: number;
  restakeCooldownMs: number;
  epochSeconds: number;
  powerPerEpoch: number;
  fighterPower: number;
}

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function signAndSendBase64Tx(b64: string): Promise<string> {
  const provider = getPhantomProvider();
  if (!provider || typeof provider.signTransaction !== 'function') {
    throw new Error('Phantom signTransaction unavailable. Update Phantom and retry.');
  }
  const tx = Transaction.from(base64ToUint8Array(b64));
  const signed = await provider.signTransaction(tx);
  const serialized = signed.serialize();
  let binary = '';
  for (let i = 0; i < serialized.length; i += 1) {
    binary += String.fromCharCode(serialized[i]!);
  }
  const sendRes = await fetch('/api/solana/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: btoa(binary) }),
  });
  const sendBody = await sendRes.json().catch(() => ({}));
  if (!sendRes.ok) {
    throw new Error(sendBody.error || 'Could not broadcast transaction.');
  }
  return String(sendBody.signature);
}

function formatCooldown(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function TrainingGroundsPage() {
  const { inTelegram } = useTelegram();
  const { cluster } = getPublicConfig();
  const [status, setStatus] = useState<TrainingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const tg = getTelegramId();
    if (!tg) return;
    const res = await fetch(`/api/staking/status?telegramId=${tg}`, { cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Could not load training status.');
      return;
    }
    setStatus(body.status as TrainingStatus);
    setError(null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!status?.staked) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [status?.staked]);

  const stake = async () => {
    const tg = getTelegramId();
    if (!tg) {
      setError('Connect Phantom and sign in first.');
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch('/api/staking/stake-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: tg }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not build stake tx.');

      const signature = await signAndSendBase64Tx(body.transaction);

      let confirmed = false;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * attempt));
        const conf = await fetch('/api/staking/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId: tg, action: 'stake', txSignature: signature }),
        });
        const confBody = await conf.json().catch(() => ({}));
        if (conf.ok) {
          setStatus(confBody.status);
          setMsg(
            confBody.quest?.awarded
              ? `Staked! Quest +${confBody.quest.points} pts. Training started.`
              : 'Badge staked — Training Grounds online.'
          );
          confirmed = true;
          break;
        }
        if (attempt === 3) {
          throw new Error(
            confBody.error ||
              `Stake sent (${signature.slice(0, 8)}…) — refresh in a moment if UI lags.`
          );
        }
      }
      if (!confirmed) await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stake failed.');
    } finally {
      setBusy(false);
    }
  };

  const unstake = async () => {
    const tg = getTelegramId();
    if (!tg) {
      setError('Connect Phantom and sign in first.');
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch('/api/staking/unstake-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: tg }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not build unstake tx.');

      const signature = await signAndSendBase64Tx(body.transaction);

      for (let attempt = 0; attempt < 4; attempt += 1) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * attempt));
        const conf = await fetch('/api/staking/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: tg,
            action: 'unstake',
            txSignature: signature,
          }),
        });
        const confBody = await conf.json().catch(() => ({}));
        if (conf.ok) {
          setStatus(confBody.status);
          const c = confBody.collected;
          setMsg(
            c?.epochs
              ? `Unstaked. Auto-collected ${c.epochs} epoch(s) (+${c.powerDelta} POWER).`
              : 'Badge unstaked — training paused.'
          );
          return;
        }
        if (attempt === 3) {
          throw new Error(confBody.error || 'Unstake sent but confirm lagged.');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unstake failed.');
    } finally {
      setBusy(false);
    }
  };

  const collect = async () => {
    const tg = getTelegramId();
    if (!tg) {
      setError('Sign in first.');
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch('/api/staking/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: tg }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Collect failed.');
      setStatus(body.status);
      setMsg(body.detail || 'Collected.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Collect failed.');
    } finally {
      setBusy(false);
    }
  };

  const epochLabel =
    status && status.epochSeconds >= 3600
      ? `${Math.round(status.epochSeconds / 3600)}h`
      : status
        ? `${status.epochSeconds}s`
        : '…';

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Link
        href="/wallet-wars"
        className="mb-4 inline-flex items-center gap-2 font-pixel text-[9px] text-cyan"
      >
        <span className="inline-block h-4 w-4">
          <PixelArrowLeft />
        </span>
        BACK
      </Link>

      <CrtPanel label="TRAINING GROUNDS" tone="phosphor">
        <p className="mb-4 font-term text-sm">
          Stake your Fighter Badge NFT on {cluster}. Freeze locks the badge in your wallet while
          it trains — +{status?.powerPerEpoch ?? 2} POWER per {epochLabel} epoch.
        </p>

        <div
          className={`training-gym mb-5 ${status?.staked ? 'training-gym--active' : ''}`}
          aria-hidden
        >
          <div className="training-gym__bar" />
          <div className="training-gym__bar" />
          <div className="training-gym__bar" />
          <span className="training-gym__label font-pixel text-[8px] text-phosphor">
            {status?.staked ? `TRAINING${tick % 2 === 0 ? '…' : ''}` : 'IDLE'}
          </span>
        </div>

        {!status?.badgeMint ? (
          <div>
            <p className="mb-3 font-term text-sm text-amber">
              Mint a Fighter Badge first, then return here to stake.
            </p>
            <Link href="/wallet-wars/mint" className="arcade-btn inline-block text-[10px]">
              MINT BADGE NFT
            </Link>
          </div>
        ) : (
          <>
            <dl className="mb-4 grid grid-cols-2 gap-2 font-term text-sm">
              <div>
                <dt className="text-ash">Badge</dt>
                <dd className="text-bone">
                  {status.badgeMint.slice(0, 4)}…{status.badgeMint.slice(-4)}
                </dd>
              </div>
              <div>
                <dt className="text-ash">Status</dt>
                <dd className={status.staked ? 'text-phosphor' : 'text-amber'}>
                  {status.staked ? 'STAKED' : 'READY'}
                </dd>
              </div>
              <div>
                <dt className="text-ash">Pending</dt>
                <dd className="text-cyan">
                  {status.pendingEpochs} ep · +{status.pendingPower} PWR
                </dd>
              </div>
              <div>
                <dt className="text-ash">POWER</dt>
                <dd className="text-phosphor">
                  {status.fighterPower}
                  {status.trainingPowerBonus
                    ? ` (+${status.trainingPowerBonus} trained)`
                    : ''}
                </dd>
              </div>
            </dl>

            {error && <p className="mb-2 font-term text-magenta">{error}</p>}
            {msg && <p className="mb-2 font-term text-phosphor">{msg}</p>}

            <div className="flex flex-wrap gap-3">
              {!status.staked ? (
                <button
                  type="button"
                  className="arcade-btn"
                  disabled={busy || status.restakeCooldownMs > 0}
                  onClick={stake}
                >
                  {busy
                    ? 'WORKING…'
                    : status.restakeCooldownMs > 0
                      ? `COOLDOWN ${formatCooldown(status.restakeCooldownMs)}`
                      : 'STAKE BADGE'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="arcade-btn"
                    disabled={busy || status.pendingEpochs <= 0}
                    onClick={collect}
                  >
                    {busy ? 'WORKING…' : 'COLLECT TRAINING'}
                  </button>
                  <button
                    type="button"
                    className="arcade-btn-cyan"
                    disabled={busy}
                    onClick={unstake}
                  >
                    UNSTAKE
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </CrtPanel>

      {inTelegram && (
        <p className="mt-4 font-term text-xs text-ash">
          If Phantom signing fails in Telegram, open this page in an external browser.
        </p>
      )}
    </main>
  );
}
