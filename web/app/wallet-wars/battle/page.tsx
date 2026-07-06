'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BattleArena } from '@/components/wallet-wars/BattleArena';
import { FighterCard, type FighterCardData } from '@/components/wallet-wars/FighterCard';
import type { BattleResolution } from '@/lib/wallet-wars/battleResolver';

function invertResolution(r: BattleResolution): BattleResolution {
  const rounds = r.rounds.map((round) => ({
    ...round,
    challenger: round.opponent,
    opponent: round.challenger,
    winner:
      round.winner === 'challenger'
        ? ('opponent' as const)
        : round.winner === 'opponent'
          ? ('challenger' as const)
          : ('tie' as const),
  }));
  let challengerWins = 0;
  let opponentWins = 0;
  for (const round of rounds) {
    if (round.winner === 'challenger') challengerWins += 1;
    if (round.winner === 'opponent') opponentWins += 1;
  }
  return {
    rounds,
    challengerWins,
    opponentWins,
    winner: r.winner === 'challenger' ? 'opponent' : 'challenger',
    decidingStat: r.decidingStat,
  };
}
import { useTelegram } from '@/components/TelegramProvider';
import { getTelegramId } from '@/lib/phantom';
import { BattleSoundProvider, SoundToggle } from '@/components/wallet-wars/SoundToggle';
import { PixelArrowLeft } from '@/components/PixelArt';

interface BattlePayload {
  battleId: string;
  challenger: FighterCardData & { stats?: unknown };
  opponent: FighterCardData & { stats?: unknown };
  resolution: BattleResolution;
  challengerWon: boolean;
  pointsAwarded: number;
}

function snapshotToCard(s: BattlePayload['challenger']): FighterCardData {
  const stats = (s as { stats?: { shield: number; power: number; strike: number; agility: number } }).stats;
  return {
    name: s.name,
    walletAddress: s.walletAddress,
    avatarUrl: s.avatarUrl,
    shield: stats?.shield ?? s.shield,
    power: stats?.power ?? s.power,
    strike: stats?.strike ?? s.strike,
    agility: stats?.agility ?? s.agility,
    totalScore: s.totalScore,
    rarity: s.rarity as FighterCardData['rarity'],
    questBonus: s.questBonus,
  };
}

function BattleInner() {
  const searchParams = useSearchParams();
  const { inTelegram } = useTelegram();
  const homeHref = '/wallet-wars';
  const invite = searchParams.get('invite');
  const battleIdParam = searchParams.get('id');

  const [payload, setPayload] = useState<BattlePayload | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('glean.battle_result');
    if (raw && battleIdParam) {
      try {
        setPayload(JSON.parse(raw) as BattlePayload);
        return;
      } catch {
        /* fall through */
      }
    }

    if (invite) {
      const tg = getTelegramId();
      if (!tg) {
        setError('Telegram session required to accept invite.');
        return;
      }
      fetch('/api/battles/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: tg, inviteCode: invite }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Accept failed');
          const acceptorWon = Boolean(data.acceptorWon);
          const normalized: BattlePayload = {
            battleId: data.battleId,
            challenger: data.opponent,
            opponent: data.challenger,
            resolution: invertResolution(data.resolution),
            challengerWon: acceptorWon,
            pointsAwarded: data.pointsAwarded,
          };
          sessionStorage.setItem('glean.battle_result', JSON.stringify(normalized));
          setPayload(normalized);
        })
        .catch((e) => setError(e.message));
    }
  }, [invite, battleIdParam]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="font-term text-magenta">{error}</p>
        <Link href={homeHref} className="mt-4 inline-block font-pixel text-[9px] text-cyan">
          BACK
        </Link>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="font-term animate-blink text-phosphor">LOADING BATTLE…</p>
      </main>
    );
  }

  const challenger = snapshotToCard(payload.challenger);
  const opponent = snapshotToCard(payload.opponent);

  if (done) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 text-center">
        <FighterCard
          fighter={payload.challengerWon ? challenger : opponent}
          variant="profile"
          className="mx-auto mb-6 max-w-[240px]"
        />
        <p className="font-pixel text-phosphor">
          {payload.challengerWon ? 'YOU WIN' : 'YOU LOSE'}
        </p>
        <p className="mt-2 font-term text-amber">+{payload.pointsAwarded} points</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/wallet-wars/result/${payload.battleId}`} className="chip-btn">
            SHARE
          </Link>
          <Link href={inTelegram ? '/wallet-wars' : '/wallet-wars'} className="arcade-btn">
            AGAIN
          </Link>
        </div>
      </main>
    );
  }

  return (
    <BattleSoundProvider>
      <main className="mx-auto max-w-3xl px-2 py-4">
        <Link href={homeHref} className="mb-2 inline-flex items-center gap-2 font-pixel text-[9px] text-cyan">
          <span className="inline-block h-4 w-4">
            <PixelArrowLeft />
          </span>
          EXIT
        </Link>
        <div className="mb-2 flex justify-end">
          <SoundToggle />
        </div>
        <BattleArena
          challenger={challenger}
          opponent={opponent}
          resolution={payload.resolution}
          challengerWon={payload.challengerWon}
          pointsAwarded={payload.pointsAwarded}
          battleId={payload.battleId}
          onDone={() => setDone(true)}
        />
      </main>
    </BattleSoundProvider>
  );
}

export default function BattlePage() {
  return (
    <Suspense fallback={<p className="p-8 font-term">Loading…</p>}>
      <BattleInner />
    </Suspense>
  );
}
