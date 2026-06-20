'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CrtPanel } from '@/components/CrtPanel';
import {
  getStoredWallet,
  getTelegramId,
  clearConnection,
} from '@/lib/phantom';

function shorten(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

interface QuestItem {
  slug: string;
  title: string;
  description: string;
  points: number;
  orderIndex: number;
  autoVerifiable: boolean;
  completed: boolean;
}

type VerifyState = Record<string, { busy: boolean; msg: string | null; ok?: boolean }>;

export default function Play() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [tg, setTg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [points, setPoints] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [verify, setVerify] = useState<VerifyState>({});

  const loadQuests = useCallback(async (telegramId: string | null) => {
    try {
      setLoadError(null);
      const qs = telegramId ? `?telegramId=${telegramId}` : '';
      const res = await fetch(`/api/quests${qs}`);
      if (!res.ok) throw new Error('Failed to load quests.');
      const data = await res.json();
      setQuests(data.quests ?? []);
      setPoints(data.points ?? 0);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load quests.');
    }
  }, []);

  useEffect(() => {
    const w = getStoredWallet();
    const t = getTelegramId();
    setWallet(w);
    setTg(t);
    setReady(true);
    loadQuests(t);
  }, [loadQuests]);

  function disconnect() {
    clearConnection();
    setWallet(null);
  }

  async function onVerify(slug: string) {
    if (!tg) {
      setVerify((s) => ({
        ...s,
        [slug]: { busy: false, msg: 'Open from the bot to link your player ID.', ok: false },
      }));
      return;
    }
    setVerify((s) => ({ ...s, [slug]: { busy: true, msg: null } }));
    try {
      const res = await fetch('/api/quests/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: tg, questSlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed.');
      }
      setVerify((s) => ({
        ...s,
        [slug]: { busy: false, msg: data.detail, ok: data.passed },
      }));
      if (data.passed) await loadQuests(tg);
    } catch (err) {
      setVerify((s) => ({
        ...s,
        [slug]: {
          busy: false,
          msg: err instanceof Error ? err.message : 'Verification failed.',
          ok: false,
        },
      }));
    }
  }

  if (ready && !wallet) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
        <CrtPanel label="NO WALLET" tone="amber">
          <p className="py-4 text-sm text-ash">
            No connected wallet found on this device. Head back and insert your
            wallet to start.
          </p>
          <Link href="/" className="arcade-btn">
            ◂ Back to start
          </Link>
        </CrtPanel>
      </main>
    );
  }

  const doneCount = quests.filter((q) => q.completed).length;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <span className="font-display text-xs text-phosphor glow-text">
          GLEAN<span className="text-magenta">AI</span>
        </span>
        {wallet ? (
          <button
            onClick={disconnect}
            className="crt-tag border-magenta/40 bg-magenta/10 text-magenta"
          >
            {shorten(wallet)} · DISCONNECT
          </button>
        ) : null}
      </header>

      <CrtPanel label="PLAYER STATUS" tone="cyan" className="mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="font-display text-lg text-phosphor glow-text">
              {doneCount}/{quests.length || '—'}
            </div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-ash">
              quests
            </div>
          </div>
          <div>
            <div className="font-display text-lg text-amber glow-text">
              {points}
            </div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-ash">
              points
            </div>
          </div>
          <div>
            <div className="font-display text-lg text-magenta glow-magenta">
              {tg ? `#${tg}` : '—'}
            </div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-ash">
              player id
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-grid pt-4 text-center">
          <Link href="/sprint" className="arcade-btn">
            <span className="text-magenta">▸</span> Play Solana Sprint
          </Link>
        </div>
      </CrtPanel>

      {!tg ? (
        <CrtPanel label="HEADS UP" tone="amber" className="mb-6">
          <p className="text-xs text-ash">
            No player ID on this device. Open GleanAI from the Telegram bot so
            your quests and points sync to your account.
          </p>
        </CrtPanel>
      ) : null}

      <CrtPanel label="QUEST LOG" tone="phosphor">
        {loadError ? (
          <p className="py-4 text-xs text-magenta">{loadError}</p>
        ) : null}

        {quests.length === 0 && !loadError ? (
          <p className="py-4 text-xs text-ash">Loading quests…</p>
        ) : null}

        <ul className="divide-y divide-grid">
          {quests.map((q) => {
            const v = verify[q.slug];
            return (
              <li key={q.slug} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-display text-[11px] ${
                        q.completed ? 'text-phosphor' : 'text-ash'
                      }`}
                    >
                      {q.completed ? '[x]' : '[ ]'}
                    </span>
                    <div>
                      <div className="text-sm text-bone">{q.title}</div>
                      <div className="text-[11px] text-ash">{q.description}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[11px] uppercase tracking-wider text-amber">
                      +{q.points}
                    </span>
                    {q.completed ? (
                      <span className="text-[10px] uppercase tracking-wider text-phosphor">
                        cleared
                      </span>
                    ) : q.autoVerifiable ? (
                      <button
                        onClick={() => onVerify(q.slug)}
                        disabled={v?.busy}
                        className="rounded-sm border border-phosphor/50 bg-phosphor/10 px-2 py-1 text-[10px] uppercase tracking-wider text-phosphor transition-colors hover:bg-phosphor/20 disabled:cursor-not-allowed disabled:border-ash disabled:text-ash"
                      >
                        {v?.busy ? 'checking…' : 'verify'}
                      </button>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wider text-ash">
                        off-chain
                      </span>
                    )}
                  </div>
                </div>
                {v?.msg ? (
                  <p
                    className={`mt-2 pl-7 text-[11px] ${
                      v.ok ? 'text-phosphor' : 'text-magenta'
                    }`}
                  >
                    {v.msg}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CrtPanel>
    </main>
  );
}
