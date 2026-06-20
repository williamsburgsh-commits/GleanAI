'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CrtPanel } from '@/components/CrtPanel';
import { useTelegram } from '@/components/TelegramProvider';
import { getStoredWallet } from '@/lib/phantom';

interface QuestItem {
  slug: string;
  title: string;
  description: string;
  points: number;
  orderIndex: number;
  autoVerifiable: boolean;
  completed: boolean;
}

interface LeaderRow {
  rank: number;
  telegramId: string;
  username: string | null;
  points: number;
}

type VerifyState = Record<string, { busy: boolean; msg: string | null; ok?: boolean }>;

function shorten(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function MiniApp() {
  const { player, loading, error, inTelegram, webApp } = useTelegram();

  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [points, setPoints] = useState(0);
  const [walletLinked, setWalletLinked] = useState(false);
  const [wallet, setWallet] = useState<string | null>(null);
  const [verify, setVerify] = useState<VerifyState>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const [top, setTop] = useState<LeaderRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  const telegramId = player?.telegramId ?? null;

  const haptic = useCallback(
    (type: 'success' | 'error' | 'warning') => {
      try {
        webApp?.HapticFeedback?.notificationOccurred(type);
      } catch {
        /* noop */
      }
    },
    [webApp]
  );

  const loadQuests = useCallback(async (tg: string | null) => {
    try {
      setLoadError(null);
      const qs = tg ? `?telegramId=${tg}` : '';
      const res = await fetch(`/api/quests${qs}`);
      if (!res.ok) throw new Error('Failed to load quests.');
      const data = await res.json();
      setQuests(data.quests ?? []);
      setPoints(data.points ?? 0);
      setWalletLinked(Boolean(data.walletLinked));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load quests.');
    }
  }, []);

  const loadLeaderboard = useCallback(async (tg: string | null) => {
    try {
      const qs = tg ? `?telegramId=${tg}` : '';
      const res = await fetch(`/api/leaderboard${qs}`);
      if (!res.ok) return;
      const data = await res.json();
      setTop(data.top ?? []);
      setMyRank(data.myRank ?? null);
    } catch {
      /* leaderboard is non-critical */
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    setWallet(getStoredWallet());
    loadQuests(telegramId);
    loadLeaderboard(telegramId);
  }, [loading, telegramId, loadQuests, loadLeaderboard]);

  function openWalletConnect() {
    const origin = window.location.origin;
    const url = `${origin}/?tg=${telegramId ?? ''}`;
    // Inside Telegram the in-app webview can't run Phantom; open externally.
    if (webApp) {
      webApp.openLink(url);
    } else {
      window.location.href = url;
    }
  }

  async function onVerify(slug: string) {
    if (!telegramId) {
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
        body: JSON.stringify({ telegramId, questSlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed.');
      setVerify((s) => ({
        ...s,
        [slug]: { busy: false, msg: data.detail, ok: data.passed },
      }));
      haptic(data.passed ? 'success' : 'error');
      if (data.passed) {
        await loadQuests(telegramId);
        await loadLeaderboard(telegramId);
      }
    } catch (err) {
      haptic('error');
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

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <p className="text-center font-display text-[11px] text-phosphor glow-text">
          BOOTING GLEANAI<span className="animate-blink"> _</span>
        </p>
      </main>
    );
  }

  const doneCount = quests.filter((q) => q.completed).length;
  const pct = quests.length ? Math.round((doneCount / quests.length) * 100) : 0;
  const displayName = player?.firstName || (player?.username ? `@${player.username}` : null);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-3 py-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <span className="font-display text-xs text-phosphor glow-text">
          GLEAN<span className="text-magenta">AI</span>
        </span>
        {wallet ? (
          <span className="crt-tag border-cyan/40 bg-cyan/10 text-cyan">
            {shorten(wallet)}
          </span>
        ) : (
          <span className="crt-tag border-amber/40 bg-amber/10 text-amber">
            {inTelegram ? 'IN-APP' : 'BROWSER'}
          </span>
        )}
      </header>

      {error ? (
        <CrtPanel label="SESSION" tone="magenta">
          <p className="text-xs text-magenta">{error}</p>
        </CrtPanel>
      ) : null}

      {/* Player status */}
      <CrtPanel label="PLAYER" tone="cyan">
        {displayName ? (
          <p className="mb-3 text-sm text-bone">
            Welcome, <span className="text-cyan">{displayName}</span>
          </p>
        ) : null}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="font-display text-lg text-amber glow-text">{points}</div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-ash">points</div>
          </div>
          <div>
            <div className="font-display text-lg text-phosphor glow-text">
              {doneCount}/{quests.length || '—'}
            </div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-ash">quests</div>
          </div>
          <div>
            <div className="font-display text-lg text-magenta glow-magenta">
              {myRank ? `#${myRank}` : '—'}
            </div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-ash">rank</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[9px] uppercase tracking-[0.3em] text-ash">
            <span>onboarding</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full border border-grid bg-slate/60">
            <div
              className="h-full bg-phosphor transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </CrtPanel>

      {/* Sprint hero CTA */}
      <Link href="/sprint" className="block">
        <div className="crt-panel scanlines border-magenta/40 p-4 transition-transform active:scale-[0.98]">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-[11px] text-magenta glow-magenta">
                SOLANA SPRINT
              </div>
              <div className="mt-1 text-[11px] text-ash">
                Speedrun the 5 actions · +100 pts
              </div>
            </div>
            <span className="font-display text-xl text-magenta glow-magenta">▸</span>
          </div>
        </div>
      </Link>

      {/* Wallet nudge for on-chain quests */}
      {!walletLinked ? (
        <CrtPanel label="WALLET" tone="amber">
          <p className="mb-3 text-[11px] text-ash">
            Connect a Phantom wallet to unlock on-chain quests. This opens in your
            browser (wallets can&apos;t run inside Telegram).
          </p>
          <button onClick={openWalletConnect} className="arcade-btn w-full">
            <span className="text-magenta">▸</span> Connect Wallet
          </button>
        </CrtPanel>
      ) : null}

      {/* Quest log */}
      <CrtPanel label="QUEST LOG" tone="phosphor">
        {loadError ? <p className="py-3 text-xs text-magenta">{loadError}</p> : null}
        {quests.length === 0 && !loadError ? (
          <p className="py-3 text-xs text-ash">Loading quests…</p>
        ) : null}
        <ul className="divide-y divide-grid">
          {quests.map((q) => {
            const v = verify[q.slug];
            const needsWallet = q.autoVerifiable && !walletLinked;
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
                    ) : needsWallet ? (
                      <button
                        onClick={openWalletConnect}
                        className="rounded-sm border border-amber/50 bg-amber/10 px-2 py-1 text-[10px] uppercase tracking-wider text-amber"
                      >
                        wallet
                      </button>
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

      {/* Leaderboard */}
      <CrtPanel label="LEADERBOARD" tone="amber">
        {top.length === 0 ? (
          <p className="py-3 text-[11px] text-ash">No players yet. Be the first.</p>
        ) : (
          <ul className="divide-y divide-grid">
            {top.map((row) => {
              const isMe = row.telegramId === telegramId;
              return (
                <li
                  key={row.telegramId}
                  className={`flex items-center justify-between py-2 text-[12px] ${
                    isMe ? 'text-phosphor' : 'text-bone'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-display text-[10px] text-ash">
                      {row.rank.toString().padStart(2, '0')}
                    </span>
                    {row.username ? `@${row.username}` : `#${row.telegramId}`}
                    {isMe ? <span className="text-[9px] text-phosphor">YOU</span> : null}
                  </span>
                  <span className="text-amber">{row.points}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CrtPanel>

      <p className="pb-2 text-center text-[9px] uppercase tracking-[0.3em] text-ash">
        gleanai · speedrun your solana onboarding
      </p>
    </main>
  );
}
