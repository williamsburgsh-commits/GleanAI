'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CrtPanel } from '@/components/CrtPanel';
import { useTelegram } from '@/components/TelegramProvider';
import { getStoredWallet } from '@/lib/phantom';
import { getLevelProgress } from '@/lib/levels';
import {
  PixelGhost,
  PixelStar,
  PixelTrophy,
  PixelCheck,
  PixelBolt,
  PixelLock,
  PixelArrowRight,
  PixelWallet,
} from '@/components/PixelArt';

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
    if (player?.walletAddress) setWalletLinked(true);
    if (player?.points) setPoints(player.points);
    loadQuests(telegramId);
    loadLeaderboard(telegramId);
  }, [loading, telegramId, loadQuests, loadLeaderboard, player?.walletAddress, player?.points]);

  // After connecting wallet in the external browser, refresh when user returns.
  useEffect(() => {
    if (!inTelegram || !telegramId) return;

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        loadQuests(telegramId);
        loadLeaderboard(telegramId);
      }
    };

    document.addEventListener('visibilitychange', refresh);
    try {
      webApp?.onEvent('viewportChanged', refresh);
    } catch {
      /* older Telegram clients */
    }

    return () => {
      document.removeEventListener('visibilitychange', refresh);
      try {
        webApp?.offEvent('viewportChanged', refresh);
      } catch {
        /* older Telegram clients */
      }
    };
  }, [inTelegram, telegramId, loadQuests, loadLeaderboard, webApp]);

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
        <p className="text-center font-pixel text-[11px] text-phosphor glow-text">
          BOOTING GLEANAI<span className="animate-blink"> _</span>
        </p>
      </main>
    );
  }

  const doneCount = quests.filter((q) => q.completed).length;
  const pct = quests.length ? Math.round((doneCount / quests.length) * 100) : 0;
  const displayName = player?.firstName || (player?.username ? `@${player.username}` : null);
  const lvl = getLevelProgress(points);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-3 py-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <span className="font-pixel text-[13px] text-phosphor">
          GLEAN<span className="text-magenta">AI</span>
        </span>
        {wallet ? (
          <span className="crt-tag" style={{ borderColor: '#2bd9ff', color: '#2bd9ff' }}>
            {shorten(wallet)}
          </span>
        ) : (
          <span className="crt-tag" style={{ borderColor: '#ffb437', color: '#ffb437' }}>
            {inTelegram ? 'IN-APP' : 'BROWSER'}
          </span>
        )}
      </header>

      {error ? (
        <CrtPanel label="SESSION" tone="magenta">
          <p className="font-term text-[17px] text-magenta">{error}</p>
        </CrtPanel>
      ) : null}

      {/* Player status */}
      <CrtPanel label="PLAYER" tone="cyan">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-9 w-9 shrink-0 text-cyan">
            <PixelGhost />
          </div>
          {displayName ? (
            <p className="font-term text-[18px] text-bone">
              Welcome, <span className="text-cyan">{displayName}</span>
            </p>
          ) : null}
        </div>

        {/* Level banner */}
        <div className="mb-4 rounded-sm border border-grid bg-slate/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 text-amber glow-amber">
                <PixelTrophy />
              </span>
              <span className="font-pixel text-[12px] text-amber glow-amber">
                LV {lvl.level}
              </span>
              <span className="font-term text-[16px] uppercase tracking-[0.15em] text-bone">
                {lvl.title}
              </span>
            </div>
            <span className="font-term text-[13px] uppercase tracking-[0.15em] text-ash">
              {lvl.isMax
                ? 'MAX'
                : `${lvl.pointsToNext} xp → lv ${lvl.level + 1}`}
            </span>
          </div>
          <div className="crt-progress mt-2">
            <i style={{ width: `${lvl.progressPct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 font-pixel text-[14px] text-amber glow-amber">
              <span className="h-3 w-3"><PixelStar /></span>
              {points}
            </div>
            <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">points</div>
          </div>
          <div>
            <div className="font-pixel text-[14px] text-phosphor glow-text">
              {doneCount}/{quests.length || '—'}
            </div>
            <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">quests</div>
          </div>
          <div>
            <div className="font-pixel text-[14px] text-magenta glow-magenta">
              {myRank ? `#${myRank}` : '—'}
            </div>
            <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">rank</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4">
          <div className="mb-1 flex justify-between font-term text-[14px] uppercase tracking-[0.2em] text-ash">
            <span>onboarding</span>
            <span>{pct}%</span>
          </div>
          <div className="crt-progress">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
      </CrtPanel>

      {/* Wallet Wars hero CTA */}
      <Link href="/wallet-wars" className="block">
        <div className="crt-panel scanlines p-4 transition-transform active:scale-[0.98]" style={{ borderColor: '#27ff7d55' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 text-phosphor">
                <PixelBolt />
              </div>
              <div>
                <div className="font-pixel text-[11px] text-phosphor glow-text">
                  WALLET WARS
                </div>
                <div className="mt-1 font-term text-[15px] text-ash">
                  Scan your fighter · battle · mint badge
                </div>
              </div>
            </div>
            <span className="h-5 w-5 text-phosphor glow-text">
              <PixelArrowRight />
            </span>
          </div>
        </div>
      </Link>

      {/* Sprint secondary */}
      <Link href="/sprint" className="block">
        <div className="crt-panel scanlines p-3 opacity-90" style={{ borderColor: '#ff3da633' }}>
          <div className="flex items-center justify-between">
            <div className="font-term text-[14px] text-ash">Solana Sprint · side mode</div>
            <span className="h-4 w-4 text-magenta"><PixelArrowRight /></span>
          </div>
        </div>
      </Link>

      {/* Wallet nudge for on-chain quests */}
      {!walletLinked ? (
        <CrtPanel label="WALLET" tone="amber">
          <div className="mb-3 flex items-start gap-3">
            <div className="mt-0.5 h-7 w-7 shrink-0 text-amber">
              <PixelLock />
            </div>
            <p className="font-term text-[16px] leading-snug text-ash">
              Connect a Phantom wallet to unlock on-chain quests. This opens in your
              browser (wallets can&apos;t run inside Telegram). After connecting,
              come back here — your progress syncs automatically.
            </p>
          </div>
          <button onClick={openWalletConnect} className="arcade-btn w-full">
            <span className="h-3 w-3 text-phosphor"><PixelWallet /></span>
            Connect Wallet
          </button>
          <button
            type="button"
            onClick={() => telegramId && loadQuests(telegramId)}
            className="chip-btn-amber mt-3 w-full"
          >
            I connected — refresh
          </button>
        </CrtPanel>
      ) : null}

      {/* Quest log — arcade stage select */}
      <CrtPanel label="QUEST LOG" tone="phosphor">
        {loadError ? <p className="py-3 font-term text-[17px] text-magenta">{loadError}</p> : null}
        {quests.length === 0 && !loadError ? (
          <p className="py-3 font-term text-[17px] text-ash">Loading quests…</p>
        ) : null}
        <ul>
          {quests.map((q, idx) => {
            const v = verify[q.slug];
            const needsWallet = q.autoVerifiable && !walletLinked;
            const locked = !q.completed && needsWallet;
            return (
              <li
                key={q.slug}
                className={`py-3 ${idx > 0 ? 'border-t-2 border-grid' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* stage marker: check if cleared, lock if locked, else stage number */}
                    <span className="font-pixel text-[11px]">
                      {q.completed ? (
                        <span className="inline-block h-5 w-5 text-phosphor"><PixelCheck /></span>
                      ) : locked ? (
                        <span className="inline-block h-5 w-5 text-ash"><PixelLock /></span>
                      ) : (
                        <span className="text-ash">{String(idx + 1).padStart(2, '0')}</span>
                      )}
                    </span>
                    <div>
                      <div className={`font-term text-[18px] ${q.completed ? 'text-phosphor' : 'text-bone'}`}>
                        {q.title}
                      </div>
                      <div className="font-term text-[15px] text-ash">{q.description}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="flex items-center gap-1 font-term text-[16px] uppercase tracking-[0.1em] text-amber">
                      <span className="h-2.5 w-2.5"><PixelStar /></span>
                      +{q.points}
                    </span>
                    {q.completed ? (
                      <span className="font-term text-[14px] uppercase tracking-[0.1em] text-phosphor">
                        cleared
                      </span>
                    ) : needsWallet ? (
                      <button onClick={openWalletConnect} className="chip-btn-amber">
                        wallet
                      </button>
                    ) : q.autoVerifiable ? (
                      <button
                        onClick={() => onVerify(q.slug)}
                        disabled={v?.busy}
                        className="chip-btn"
                      >
                        {v?.busy ? 'checking…' : 'verify'}
                      </button>
                    ) : (
                      <span className="font-term text-[14px] uppercase tracking-[0.1em] text-ash">
                        off-chain
                      </span>
                    )}
                  </div>
                </div>
                {v?.msg ? (
                  <p
                    className={`mt-2 pl-8 font-term text-[16px] ${
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
        <div className="mb-2 flex items-center gap-2 text-amber">
          <span className="h-4 w-4"><PixelTrophy /></span>
        </div>
        {top.length === 0 ? (
          <p className="py-3 font-term text-[16px] text-ash">No players yet. Be the first.</p>
        ) : (
          <ul>
            {top.map((row, idx) => {
              const isMe = row.telegramId === telegramId;
              return (
                <li
                  key={row.telegramId}
                  className={`flex items-center justify-between py-2 font-term text-[18px] ${
                    idx > 0 ? 'border-t-2 border-grid' : ''
                  } ${isMe ? 'text-phosphor' : 'text-bone'}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-pixel text-[10px] text-ash">
                      {row.rank.toString().padStart(2, '0')}
                    </span>
                    {row.username ? `@${row.username}` : `#${row.telegramId}`}
                    {isMe ? <span className="font-term text-[14px] text-phosphor">YOU</span> : null}
                  </span>
                  <span className="flex items-center gap-1 text-amber">
                    <span className="h-2.5 w-2.5"><PixelStar /></span>
                    {row.points}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CrtPanel>

      <p className="pb-2 text-center font-term text-[14px] uppercase tracking-[0.2em] text-ash">
        gleanai · speedrun your solana onboarding
      </p>
    </main>
  );
}
