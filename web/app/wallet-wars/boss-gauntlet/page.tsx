'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CrtPanel } from '@/components/CrtPanel';
import { useTelegram } from '@/components/TelegramProvider';
import { getTelegramId } from '@/lib/phantom';
import { PixelArrowLeft, PixelBolt, PixelTrophy } from '@/components/PixelArt';
import { rarityLabel, type FighterRarity } from '@/lib/wallet-wars/rarity';
import { bossAvatarUrl } from '@/lib/wallet-wars/bossAvatar';

interface BossLadderEntry {
  slug: string;
  name: string;
  title: string;
  tier: string;
  rarity: string;
  order: number;
  status: 'locked' | 'current' | 'cleared';
  solscanUrl: string | null;
}

interface GauntletState {
  defeatedCount: number;
  totalBosses: number;
  status: 'active' | 'champion';
  championAt: string | null;
  nextBossSlug: string | null;
  bosses: BossLadderEntry[];
  hasFighter: boolean;
  walletLinked: boolean;
}

const TIER_COLORS: Record<string, string> = {
  common: 'text-ash',
  rare: 'text-cyan',
  epic: 'text-magenta',
  legendary: 'text-amber',
};

function StatusIcon({ status }: { status: BossLadderEntry['status'] }) {
  if (status === 'cleared') return <span className="text-phosphor">✓</span>;
  if (status === 'current') return <span className="animate-blink text-magenta">⚔</span>;
  return <span className="text-ash/50">🔒</span>;
}

export default function BossGauntletPage() {
  const router = useRouter();
  const { inTelegram, player, loading: tgLoading } = useTelegram();
  const homeHref = '/wallet-wars';
  const backHref = inTelegram ? '/app' : '/play';

  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [state, setState] = useState<GauntletState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fighting, setFighting] = useState(false);

  const loadProgress = useCallback(async (tg: string) => {
    const res = await fetch(`/api/boss-gauntlet?telegramId=${tg}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load gauntlet');
    setState(data as GauntletState);
  }, []);

  useEffect(() => {
    if (tgLoading) return;
    const tg = player?.telegramId ?? getTelegramId();
    setTelegramId(tg);
    if (tg) {
      loadProgress(tg).catch((e) => setError(e.message));
    }
  }, [tgLoading, player?.telegramId, loadProgress]);

  const startBossFight = async () => {
    if (!telegramId || !state?.nextBossSlug) return;
    setFighting(true);
    setError(null);
    try {
      const res = await fetch('/api/boss-gauntlet/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, bossSlug: state.nextBossSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Battle failed');
      sessionStorage.setItem('glean.battle_result', JSON.stringify(data));
      router.push(`/wallet-wars/battle?id=${data.battleId}&mode=boss`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Battle failed');
    } finally {
      setFighting(false);
    }
  };

  const currentBoss = state?.bosses.find((b) => b.status === 'current');

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href={backHref} className="mb-2 inline-flex items-center gap-2 font-pixel text-[9px] text-cyan">
        <span className="inline-block h-4 w-4">
          <PixelArrowLeft />
        </span>
        HOME
      </Link>
      <Link href={homeHref} className="mb-4 ml-4 inline-flex font-pixel text-[9px] text-ash hover:text-phosphor">
        WALLET WARS
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-block h-8 w-8 text-magenta">
            <PixelBolt />
          </span>
          <div>
            <h1 className="font-pixel text-sm text-magenta glow-magenta">BOSS GAUNTLET</h1>
            <p className="mt-1 font-term text-sm text-bone/70">
              Seven bosses. One ladder. Defeat Toly to become champion.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <CrtPanel label="ERROR" tone="magenta" className="mb-4">
          <p className="font-term text-sm">{error}</p>
        </CrtPanel>
      )}

      {!state && !error && (
        <p className="font-term animate-blink text-phosphor">LOADING GAUNTLET…</p>
      )}

      {state && (
        <>
          <CrtPanel label="PROGRESS" tone="phosphor" className="mb-4">
            <div className="flex items-center justify-between">
              <p className="font-pixel text-[11px] text-phosphor">
                {state.defeatedCount} / {state.totalBosses} DEFEATED
              </p>
              {state.status === 'champion' && (
                <span className="inline-flex items-center gap-1 font-pixel text-[9px] text-amber">
                  <span className="h-4 w-4">
                    <PixelTrophy />
                  </span>
                  CHAMPION
                </span>
              )}
            </div>
            {state.championAt && (
              <p className="mt-2 font-term text-xs text-ash">
                Crowned {new Date(state.championAt).toLocaleString()}
              </p>
            )}
          </CrtPanel>

          {!state.walletLinked && (
            <CrtPanel label="WALLET" tone="amber" className="mb-4">
              <p className="font-term text-sm">Connect your wallet in Wallet Wars to enter the gauntlet.</p>
            </CrtPanel>
          )}

          {state.walletLinked && !state.hasFighter && (
            <CrtPanel label="SCAN" tone="cyan" className="mb-4">
              <p className="mb-3 font-term text-sm">Scan your fighter before challenging bosses.</p>
              <Link href="/wallet-wars" className="arcade-btn-cyan inline-block text-[10px]">
                GO SCAN
              </Link>
            </CrtPanel>
          )}

          <CrtPanel label="BOSS LADDER" tone="magenta" className="mb-4">
            <ul className="space-y-3">
              {state.bosses.map((boss) => (
                <li
                  key={boss.slug}
                  className={`flex items-center gap-3 rounded border px-3 py-2 ${
                    boss.status === 'current'
                      ? 'border-magenta/60 bg-magenta/5'
                      : boss.status === 'cleared'
                        ? 'border-phosphor/30 bg-phosphor/5'
                        : 'border-ash/20 opacity-60'
                  }`}
                >
                  <span className="font-pixel text-[10px] text-ash w-6">{boss.order}</span>
                  <StatusIcon status={boss.status} />
                  <div
                    className={`h-10 w-10 shrink-0 overflow-hidden border bg-void ${
                      boss.status === 'current'
                        ? 'border-magenta/60'
                        : boss.status === 'cleared'
                          ? 'border-phosphor/40'
                          : 'border-ash/30'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={bossAvatarUrl(boss.slug)}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-pixel text-[10px] text-bone truncate">{boss.name}</p>
                    <p className="font-term text-xs text-ash truncate">{boss.title}</p>
                  </div>
                  <span className={`font-pixel text-[8px] ${TIER_COLORS[boss.tier] ?? 'text-ash'}`}>
                    {rarityLabel(boss.rarity as FighterRarity)}
                  </span>
                </li>
              ))}
            </ul>
          </CrtPanel>

          {state.status !== 'champion' && currentBoss && state.hasFighter && (
            <CrtPanel label="CHALLENGE" tone="amber" className="mb-4">
              <p className="mb-2 font-term text-sm">
                Next boss: <span className="text-amber">{currentBoss.name}</span>
              </p>
              <button
                type="button"
                className="arcade-btn w-full"
                disabled={fighting || !telegramId}
                onClick={startBossFight}
              >
                {fighting ? 'SUMMONING…' : `FIGHT ${currentBoss.name.toUpperCase()}`}
              </button>
            </CrtPanel>
          )}

          {state.status === 'champion' && (
            <CrtPanel label="VICTORY" tone="phosphor">
              <p className="font-term text-sm text-phosphor">
                You cleared the gauntlet and defeated Toly. Share your battle results from the recap screen.
              </p>
              <Link href="/wallet-wars" className="mt-3 inline-block chip-btn-amber">
                BACK TO ARENA
              </Link>
            </CrtPanel>
          )}
        </>
      )}
    </main>
  );
}
