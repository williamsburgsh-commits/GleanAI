'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CrtPanel } from '@/components/CrtPanel';
import { GameModeCards } from '@/components/GameModeCards';
import { disconnectWallet } from '@/lib/phantom';
import { getLevelProgress } from '@/lib/levels';
import type { TelegramWebApp } from '@/types/telegram';
import {
  PixelGhost,
  PixelStar,
  PixelTrophy,
  PixelCheck,
  PixelLock,
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

type VerifyState = Record<string, { busy: boolean; msg: string | null; ok?: boolean }>;

interface PlayerSlice {
  telegramId?: string;
  firstName?: string | null;
  username?: string | null;
  walletAddress?: string | null;
  points?: number;
}

interface PlayTabProps {
  telegramId: string | null;
  inTelegram: boolean;
  webApp: TelegramWebApp | null;
  player: PlayerSlice | null;
  wallet: string | null;
  walletLinked: boolean;
  setWallet: (w: string | null) => void;
  setWalletLinked: (v: boolean) => void;
  setWalletAddress: (addr: string | null) => void;
  haptic: (type: 'success' | 'error' | 'warning') => void;
  onOpenInvite: () => void;
}

function shorten(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function PlayTab({
  telegramId,
  inTelegram,
  webApp,
  player,
  wallet,
  walletLinked,
  setWallet,
  setWalletLinked,
  setWalletAddress,
  haptic,
  onOpenInvite,
}: PlayTabProps) {
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [points, setPoints] = useState(0);
  const [verify, setVerify] = useState<VerifyState>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [epochPoints, setEpochPoints] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [pointsBreakdown, setPointsBreakdown] = useState({
    epochQuests: 0,
    epochBattles: 0,
    epochReferrals: 0,
  });

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
  }, [setWalletLinked]);

  const loadLeaderboard = useCallback(async (tg: string | null) => {
    try {
      const qs = new URLSearchParams({ mode: 'epoch', limit: '10' });
      if (tg) qs.set('telegramId', tg);
      const res = await fetch(`/api/leaderboard?${qs}`);
      if (!res.ok) return;
      const data = await res.json();
      setMyRank(data.myRank ?? null);
    } catch {
      /* non-critical */
    }
  }, []);

  const loadPointsSummary = useCallback(async (tg: string | null) => {
    if (!tg) return;
    try {
      const res = await fetch(`/api/points/summary?telegramId=${tg}`);
      if (!res.ok) return;
      const data = await res.json();
      setEpochPoints(data.epochTotal ?? 0);
      setPointsBreakdown({
        epochQuests: data.epochQuests ?? 0,
        epochBattles: data.epochBattles ?? 0,
        epochReferrals: data.epochReferrals ?? 0,
      });
    } catch {
      /* non-critical */
    }
  }, []);

  const refreshAll = useCallback(
    async (tg: string | null) => {
      await Promise.all([loadQuests(tg), loadLeaderboard(tg), loadPointsSummary(tg)]);
    },
    [loadQuests, loadLeaderboard, loadPointsSummary]
  );

  useEffect(() => {
    if (player?.points) setPoints(player.points);
    refreshAll(telegramId);
  }, [telegramId, player?.points, refreshAll]);

  useEffect(() => {
    if (!inTelegram || !telegramId) return;

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        refreshAll(telegramId);
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
  }, [inTelegram, telegramId, refreshAll, webApp]);

  function openWalletConnect() {
    const origin = window.location.origin;
    const url = `${origin}/?tg=${telegramId ?? ''}`;
    if (webApp) {
      webApp.openLink(url);
    } else {
      window.location.href = url;
    }
  }

  async function onDisconnectWallet() {
    if (!telegramId) return;
    setDisconnectError(null);
    setDisconnecting(true);
    try {
      await disconnectWallet(telegramId);
      setWallet(null);
      setWalletLinked(false);
      setWalletAddress(null);
      haptic('success');
      await refreshAll(telegramId);
    } catch (err) {
      haptic('error');
      setDisconnectError(err instanceof Error ? err.message : 'Could not disconnect wallet.');
    } finally {
      setDisconnecting(false);
    }
  }

  const displayWallet = player?.walletAddress ?? wallet;

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
      if (data.passed) await refreshAll(telegramId);
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

  const doneCount = quests.filter((q) => q.completed).length;
  const pct = quests.length ? Math.round((doneCount / quests.length) * 100) : 0;
  const displayName = player?.firstName || (player?.username ? `@${player.username}` : null);
  const lvl = getLevelProgress(points);

  return (
    <>
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

        <div className="mb-4 rounded-sm border border-grid bg-slate/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-5 w-5 text-amber glow-amber">
                <PixelTrophy />
              </span>
              <span className="font-pixel text-[12px] text-amber glow-amber">LV {lvl.level}</span>
              <span className="font-term text-[16px] uppercase tracking-[0.15em] text-bone">
                {lvl.title}
              </span>
            </div>
            <span className="font-term text-[13px] uppercase tracking-[0.15em] text-ash">
              {lvl.isMax ? 'MAX' : `${lvl.pointsToNext} xp → lv ${lvl.level + 1}`}
            </span>
          </div>
          <div className="crt-progress mt-2">
            <i style={{ width: `${lvl.progressPct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 font-pixel text-[14px] text-amber glow-amber">
              <span className="h-3 w-3">
                <PixelStar />
              </span>
              {points}
            </div>
            <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">
              lifetime
            </div>
          </div>
          <div>
            <div className="font-pixel text-[14px] text-phosphor glow-text">{epochPoints}</div>
            <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">
              this week
            </div>
          </div>
          <div>
            <div className="font-pixel text-[14px] text-magenta glow-magenta">
              {myRank ? `#${myRank}` : '—'}
            </div>
            <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">
              rank
            </div>
          </div>
        </div>
        <p className="mt-3 text-center font-term text-[13px] text-ash">
          Earned this week — quests {pointsBreakdown.epochQuests} · battles{' '}
          {pointsBreakdown.epochBattles} · referrals {pointsBreakdown.epochReferrals}
          {' · '}
          <span className="text-phosphor">→ $GLEAN at launch</span>
        </p>
        <button
          type="button"
          onClick={onOpenInvite}
          className="mt-2 w-full text-center font-term text-[14px] text-cyan underline decoration-dotted underline-offset-2"
        >
          Invite friends → earn up to 200 pts each
        </button>
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

      <GameModeCards />

      {walletLinked ? (
        <CrtPanel label="WALLET" tone="cyan">
          <p className="mb-3 font-term text-[16px] leading-snug text-ash">
            Connected as{' '}
            <span className="text-cyan">{displayWallet ? shorten(displayWallet) : 'linked'}</span>.
            Disconnect to switch wallets or return to the connect screen.
          </p>
          <button
            type="button"
            onClick={onDisconnectWallet}
            disabled={disconnecting}
            className="chip-btn-magenta w-full"
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect Wallet'}
          </button>
          {disconnectError ? (
            <p className="mt-2 font-term text-[15px] text-magenta">{disconnectError}</p>
          ) : null}
        </CrtPanel>
      ) : (
        <CrtPanel label="WALLET" tone="amber">
          <div className="mb-3 flex items-start gap-3">
            <div className="mt-0.5 h-7 w-7 shrink-0 text-amber">
              <PixelLock />
            </div>
            <p className="font-term text-[16px] leading-snug text-ash">
              Connect a Phantom wallet to unlock on-chain quests. This opens in your browser (wallets
              can&apos;t run inside Telegram). After connecting, come back here — your progress syncs
              automatically.
            </p>
          </div>
          <button onClick={openWalletConnect} className="arcade-btn w-full">
            <span className="h-3 w-3 text-phosphor">
              <PixelWallet />
            </span>
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
      )}

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
              <li key={q.slug} className={`py-3 ${idx > 0 ? 'border-t-2 border-grid' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-pixel text-[11px]">
                      {q.completed ? (
                        <span className="inline-block h-5 w-5 text-phosphor">
                          <PixelCheck />
                        </span>
                      ) : locked ? (
                        <span className="inline-block h-5 w-5 text-ash">
                          <PixelLock />
                        </span>
                      ) : (
                        <span className="text-ash">{String(idx + 1).padStart(2, '0')}</span>
                      )}
                    </span>
                    <div>
                      <div
                        className={`font-term text-[18px] ${q.completed ? 'text-phosphor' : 'text-bone'}`}
                      >
                        {q.title}
                      </div>
                      <div className="font-term text-[15px] text-ash">{q.description}</div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="flex items-center gap-1 font-term text-[16px] uppercase tracking-[0.1em] text-amber">
                      <span className="h-2.5 w-2.5">
                        <PixelStar />
                      </span>
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
                    ) : q.slug === 'print-receipt' ? (
                      <Link href="/receipt" className="chip-btn-cyan">
                        print
                      </Link>
                    ) : q.slug === 'complete-ghost-race' ? (
                      <Link href="/ghost-race" className="chip-btn-cyan">
                        race
                      </Link>
                    ) : q.slug === 'refer-friend' ? (
                      <button type="button" onClick={onOpenInvite} className="chip-btn-cyan">
                        invite
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
    </>
  );
}
