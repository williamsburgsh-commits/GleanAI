'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CrtPanel } from '@/components/CrtPanel';
import { FighterCard, type FighterCardData } from '@/components/wallet-wars/FighterCard';
import { useTelegram } from '@/components/TelegramProvider';
import { getTelegramId, getStoredWallet } from '@/lib/phantom';
import { QUEST_BOOST_HINTS } from '@/lib/wallet-wars/questBoosts';
import { PixelArrowLeft, PixelBolt } from '@/components/PixelArt';
import type { BotDifficulty } from '@/lib/wallet-wars/botFactory';

interface BattleHistoryRow {
  id: string;
  opponentName: string;
  won: boolean;
  pointsAwarded: number;
  createdAt: string;
}

export default function WalletWarsPage() {
  const { inTelegram, player, loading: tgLoading } = useTelegram();
  const homeHref = inTelegram ? '/app' : '/play';

  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [fighter, setFighter] = useState<FighterCardData | null>(null);
  const [canRescan, setCanRescan] = useState(true);
  const [nextRescanAt, setNextRescanAt] = useState<string | null>(null);
  const [walletLinked, setWalletLinked] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BattleHistoryRow[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());

  const loadFighter = useCallback(async (tg: string) => {
    const res = await fetch(`/api/fighter?telegramId=${tg}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load fighter');
    setWalletLinked(Boolean(data.walletLinked));
    if (data.fighter) {
      setFighter(data.fighter);
      setCanRescan(data.fighter.canRescan);
      setNextRescanAt(data.fighter.nextRescanAt);
    }
  }, []);

  const loadQuests = useCallback(async (tg: string) => {
    const res = await fetch(`/api/quests?telegramId=${tg}`);
    if (!res.ok) return;
    const data = await res.json();
    const done = new Set<string>(
      (data.quests as { slug: string; completed: boolean }[])
        .filter((q) => q.completed)
        .map((q) => q.slug)
    );
    setCompletedQuests(done);
  }, []);

  const loadHistory = useCallback(async (tg: string) => {
    const res = await fetch(`/api/battles/history?telegramId=${tg}`);
    if (!res.ok) return;
    const data = await res.json();
    setHistory(data.battles ?? []);
  }, []);

  useEffect(() => {
    if (tgLoading) return;
    const tg = player?.telegramId ?? getTelegramId();
    setTelegramId(tg);
    if (tg) {
      loadFighter(tg).catch((e) => setError(e.message));
      loadQuests(tg);
      loadHistory(tg);
    }
  }, [tgLoading, player?.telegramId, loadFighter, loadQuests, loadHistory]);

  const scan = async () => {
    if (!telegramId) return;
    setScanning(true);
    setError(null);
    try {
      const res = await fetch('/api/fighter/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      setFighter(data.fighter);
      setCanRescan(false);
      loadQuests(telegramId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const startBotBattle = async (difficulty: BotDifficulty) => {
    if (!telegramId) return;
    setBusy('bot');
    try {
      const res = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, opponentType: 'bot', difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Battle failed');
      sessionStorage.setItem('glean.battle_result', JSON.stringify(data));
      window.location.href = `/wallet-wars/battle?id=${data.battleId}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Battle failed');
    } finally {
      setBusy(null);
    }
  };

  const startMatch = async () => {
    if (!telegramId) return;
    setBusy('match');
    try {
      const res = await fetch('/api/battles/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Match failed');
      sessionStorage.setItem('glean.battle_result', JSON.stringify(data));
      window.location.href = `/wallet-wars/battle?id=${data.battleId}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Match failed');
    } finally {
      setBusy(null);
    }
  };

  const createInvite = async () => {
    if (!telegramId) return;
    setBusy('invite');
    try {
      const res = await fetch('/api/battles/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invite failed');
      setInviteUrl(data.shareUrl);
      if (navigator.clipboard) await navigator.clipboard.writeText(data.shareUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invite failed');
    } finally {
      setBusy(null);
    }
  };

  const wallet = getStoredWallet();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href={homeHref} className="mb-4 inline-flex items-center gap-2 font-pixel text-[9px] text-cyan">
        <span className="inline-block h-4 w-4">
          <PixelArrowLeft />
        </span>
        BACK
      </Link>

      <header className="mb-6">
        <h1 className="font-pixel text-sm text-phosphor">WALLET WARS</h1>
        <p className="mt-2 font-term text-bone/80">
          Your on-chain history becomes your fighter. Scan, battle, level up.
        </p>
      </header>

      {error && (
        <CrtPanel label="ERROR" tone="magenta" className="mb-4">
          <p className="font-term text-sm">{error}</p>
        </CrtPanel>
      )}

      {!walletLinked && !wallet && (
        <CrtPanel label="WALLET" tone="amber" className="mb-4">
          <p className="font-term text-sm">Connect your Phantom wallet to scan your fighter.</p>
        </CrtPanel>
      )}

      {!fighter ? (
        <CrtPanel label="SCAN" tone="cyan" className="mb-6">
          <p className="mb-4 font-term text-sm">
            Link your wallet, then scan on-chain activity to mint your fighter card.
          </p>
          <button
            type="button"
            className="arcade-btn"
            disabled={scanning || !telegramId || !walletLinked}
            onClick={scan}
          >
            {scanning ? 'SCANNING…' : 'SCAN FIGHTER'}
          </button>
        </CrtPanel>
      ) : (
        <div className="mb-6 flex justify-center">
          <FighterCard fighter={fighter} variant="profile" className="w-full max-w-[280px]" />
        </div>
      )}

      {fighter && (
        <>
          <CrtPanel label="ACTIONS" tone="magenta" className="mb-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="chip-btn"
                disabled={!canRescan || scanning}
                onClick={scan}
              >
                {scanning ? '…' : 'RESCAN'}
              </button>
              {!canRescan && nextRescanAt && (
                <span className="font-term text-xs text-ash">
                  Next rescan: {new Date(nextRescanAt).toLocaleString()}
                </span>
              )}
              <Link href="/wallet-wars/mint" className="chip-btn-amber">
                MINT BADGE
              </Link>
            </div>
          </CrtPanel>

          <CrtPanel label="BATTLE" tone="phosphor" className="mb-4">
            <p className="mb-3 font-term text-sm">Choose your opponent:</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(['easy', 'normal', 'hard'] as BotDifficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  className="arcade-btn-cyan text-[10px]"
                  disabled={busy !== null}
                  onClick={() => startBotBattle(d)}
                >
                  BOT {d.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="arcade-btn"
                disabled={busy !== null}
                onClick={startMatch}
              >
                {busy === 'match' ? '…' : 'RANDOM MATCH'}
              </button>
              <button
                type="button"
                className="chip-btn-magenta"
                disabled={busy !== null}
                onClick={createInvite}
              >
                {busy === 'invite' ? '…' : 'CHALLENGE FRIEND'}
              </button>
            </div>
            {inviteUrl && (
              <p className="mt-2 break-all font-term text-xs text-phosphor">{inviteUrl}</p>
            )}
          </CrtPanel>

          <CrtPanel label="QUEST BOOSTS" tone="amber" className="mb-4">
            <ul className="space-y-1 font-term text-sm">
              {QUEST_BOOST_HINTS.map((h) => (
                <li key={h.slug} className={completedQuests.has(h.slug) ? 'text-phosphor' : 'text-ash'}>
                  {completedQuests.has(h.slug) ? '✓' : '○'} {h.label}
                  {' — '}
                  {Object.entries(h.boost)
                    .map(([k, v]) => `+${v} ${k}`)
                    .join(', ')}
                </li>
              ))}
            </ul>
          </CrtPanel>

          {history.length > 0 && (
            <CrtPanel label="BATTLE LOG" tone="cyan">
              <ul className="space-y-2 font-term text-sm">
                {history.map((b) => (
                  <li key={b.id}>
                    <Link href={`/wallet-wars/result/${b.id}`} className="hover:text-phosphor">
                      {b.won ? 'WIN' : 'LOSS'} vs {b.opponentName} (+{b.pointsAwarded})
                    </Link>
                  </li>
                ))}
              </ul>
            </CrtPanel>
          )}
        </>
      )}

      <div className="mt-6 flex justify-center">
        <span className="inline-block h-8 w-8 text-phosphor">
          <PixelBolt />
        </span>
      </div>
    </main>
  );
}
