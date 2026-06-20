'use client';

import { useCallback, useEffect, useState } from 'react';
import { CrtPanel } from '@/components/CrtPanel';
import { RecipientPicker, type RecipientUser } from '@/components/admin/RecipientPicker';

type Status = 'pending' | 'paid' | 'cancelled';

interface Reward {
  id: string;
  amount_sol: string;
  reason: string;
  status: Status;
  payout_tx_signature: string | null;
  paid_at: string | null;
  created_at: string;
  user: {
    id: string;
    telegram_id: number;
    telegram_username: string | null;
    wallet_address: string | null;
  } | null;
}

interface Summary {
  pendingCount: number;
  pendingSol: number;
  paidSol: number;
}

const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet';

function explorerTx(sig: string) {
  const suffix = CLUSTER === 'mainnet-beta' || CLUSTER === 'mainnet' ? '' : `?cluster=${CLUSTER}`;
  return `https://solscan.io/tx/${sig}${suffix}`;
}

function shorten(addr: string | null) {
  return addr ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : '—';
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [recipient, setRecipient] = useState<RecipientUser | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  // Mark-paid inline state
  const [payingId, setPayingId] = useState<string | null>(null);
  const [txSig, setTxSig] = useState('');

  const load = useCallback(async (status: 'all' | Status) => {
    setError(null);
    const qs = status === 'all' ? '' : `?status=${status}`;
    const res = await fetch(`/api/admin/rewards${qs}`);
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    if (!res.ok) {
      setError('Could not load rewards.');
      return;
    }
    const data = await res.json();
    setRewards(data.rewards ?? []);
    setSummary(data.summary ?? null);
    setAuthed(true);
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoginError(data.error || 'Login failed.');
      return;
    }
    setPassword('');
    load(filter);
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    setRewards([]);
    setSummary(null);
  }

  async function createReward(e: React.FormEvent) {
    e.preventDefault();
    setCreateMsg(null);
    if (!recipient) {
      setCreateMsg('Pick a recipient first.');
      return;
    }
    const res = await fetch('/api/admin/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: recipient.id,
        amountSol: Number(amount),
        reason,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setCreateMsg(data.error || 'Could not create reward.');
      return;
    }
    setCreateMsg('Reward created.');
    setRecipient(null);
    setAmount('');
    setReason('');
    load(filter);
  }

  async function setStatus(id: string, status: Status, sig?: string) {
    const res = await fetch(`/api/admin/rewards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, payoutTxSignature: sig }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Could not update reward.');
      return;
    }
    setPayingId(null);
    setTxSig('');
    load(filter);
  }

  // --- Login gate ---------------------------------------------------------
  if (authed === false) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <CrtPanel label="ADMIN // ACCESS" tone="magenta">
          <form onSubmit={login} className="space-y-4 py-2">
            <p className="text-xs text-ash">
              Restricted. Enter the admin password to continue.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="w-full rounded-sm border border-grid bg-slate/60 px-3 py-2 text-sm text-bone outline-none focus:border-phosphor"
            />
            {loginError ? (
              <p className="text-xs text-magenta">{loginError}</p>
            ) : null}
            <button type="submit" className="arcade-btn w-full">
              Enter
            </button>
          </form>
        </CrtPanel>
      </main>
    );
  }

  if (authed === null) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
        <p className="text-center font-display text-[11px] text-phosphor glow-text">
          LOADING<span className="animate-blink"> _</span>
        </p>
      </main>
    );
  }

  // --- Dashboard ----------------------------------------------------------
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <span className="font-display text-xs text-phosphor glow-text">
          GLEAN<span className="text-magenta">AI</span> · ADMIN
        </span>
        <button
          onClick={logout}
          className="crt-tag border-magenta/40 bg-magenta/10 text-magenta"
        >
          logout
        </button>
      </header>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <CrtPanel label="PENDING" tone="amber">
          <div className="text-center">
            <div className="font-display text-xl text-amber glow-text">
              {summary?.pendingCount ?? 0}
            </div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-ash">
              to pay
            </div>
          </div>
        </CrtPanel>
        <CrtPanel label="OWED" tone="magenta">
          <div className="text-center">
            <div className="font-display text-xl text-magenta glow-magenta">
              {(summary?.pendingSol ?? 0).toFixed(3)}
            </div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-ash">
              SOL pending
            </div>
          </div>
        </CrtPanel>
        <CrtPanel label="PAID" tone="phosphor">
          <div className="text-center">
            <div className="font-display text-xl text-phosphor glow-text">
              {(summary?.paidSol ?? 0).toFixed(3)}
            </div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-ash">
              SOL paid
            </div>
          </div>
        </CrtPanel>
      </div>

      {/* Create reward */}
      <CrtPanel label="NEW REWARD" tone="cyan" className="mb-6">
        <form onSubmit={createReward} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-ash">
              recipient
            </label>
            <RecipientPicker onPick={setRecipient} selectedId={recipient?.id} />
            {recipient ? (
              <p className="mt-2 text-[11px] text-phosphor">
                Selected:{' '}
                {recipient.telegram_username
                  ? `@${recipient.telegram_username}`
                  : `#${recipient.telegram_id}`}
              </p>
            ) : null}
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-ash">
                amount (SOL)
              </label>
              <input
                type="number"
                step="0.000000001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.5"
                className="w-full rounded-sm border border-grid bg-slate/60 px-3 py-2 text-sm text-bone outline-none focus:border-phosphor"
              />
            </div>
            <div>
              <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-ash">
                reason
              </label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Top 10 leaderboard - week 1"
                className="w-full rounded-sm border border-grid bg-slate/60 px-3 py-2 text-sm text-bone outline-none focus:border-phosphor"
              />
            </div>
            <button type="submit" className="arcade-btn w-full">
              Create reward
            </button>
            {createMsg ? (
              <p
                className={`text-[11px] ${
                  createMsg === 'Reward created.' ? 'text-phosphor' : 'text-magenta'
                }`}
              >
                {createMsg}
              </p>
            ) : null}
          </div>
        </form>
      </CrtPanel>

      {/* Filters */}
      <div className="mb-3 flex gap-2">
        {(['all', 'pending', 'paid', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-sm border px-3 py-1 text-[10px] uppercase tracking-wider transition-colors ${
              filter === f
                ? 'border-phosphor bg-phosphor/15 text-phosphor'
                : 'border-grid text-ash hover:text-bone'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Rewards table */}
      <CrtPanel label="REWARDS" tone="phosphor">
        {error ? <p className="mb-3 text-xs text-magenta">{error}</p> : null}
        {rewards.length === 0 ? (
          <p className="py-4 text-xs text-ash">No rewards in this view.</p>
        ) : (
          <ul className="divide-y divide-grid">
            {rewards.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-bone">
                      {r.user?.telegram_username
                        ? `@${r.user.telegram_username}`
                        : r.user
                        ? `#${r.user.telegram_id}`
                        : 'unknown user'}
                      <span className="ml-2 text-[11px] text-ash">
                        {shorten(r.user?.wallet_address ?? null)}
                      </span>
                    </div>
                    <div className="text-[11px] text-ash">{r.reason}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm text-amber">
                      {Number(r.amount_sol).toFixed(3)} SOL
                    </span>
                    <span
                      className={`rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                        r.status === 'pending'
                          ? 'border-amber/50 text-amber'
                          : r.status === 'paid'
                          ? 'border-phosphor/50 text-phosphor'
                          : 'border-ash/40 text-ash'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {r.status === 'pending' ? (
                  payingId === r.id ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        value={txSig}
                        onChange={(e) => setTxSig(e.target.value)}
                        placeholder="payout tx signature"
                        className="min-w-0 flex-1 rounded-sm border border-grid bg-slate/60 px-2 py-1 text-[11px] text-bone outline-none focus:border-phosphor"
                      />
                      <button
                        onClick={() => setStatus(r.id, 'paid', txSig)}
                        className="rounded-sm border border-phosphor/50 bg-phosphor/10 px-2 py-1 text-[10px] uppercase tracking-wider text-phosphor hover:bg-phosphor/20"
                      >
                        confirm
                      </button>
                      <button
                        onClick={() => {
                          setPayingId(null);
                          setTxSig('');
                        }}
                        className="text-[10px] uppercase tracking-wider text-ash"
                      >
                        cancel
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => {
                          setPayingId(r.id);
                          setTxSig('');
                        }}
                        className="rounded-sm border border-phosphor/50 bg-phosphor/10 px-2 py-1 text-[10px] uppercase tracking-wider text-phosphor hover:bg-phosphor/20"
                      >
                        mark paid
                      </button>
                      <button
                        onClick={() => setStatus(r.id, 'cancelled')}
                        className="rounded-sm border border-magenta/40 px-2 py-1 text-[10px] uppercase tracking-wider text-magenta hover:bg-magenta/10"
                      >
                        cancel
                      </button>
                    </div>
                  )
                ) : null}

                {r.status === 'paid' && r.payout_tx_signature ? (
                  <a
                    href={explorerTx(r.payout_tx_signature)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-[11px] text-cyan underline"
                  >
                    view payout tx ↗
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CrtPanel>
    </main>
  );
}
