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
    winner:
      r.winner === 'tie'
        ? ('tie' as const)
        : r.winner === 'challenger'
          ? ('opponent' as const)
          : ('challenger' as const),
    decidingStat: r.decidingStat,
  };
}
import { useTelegram } from '@/components/TelegramProvider';
import { getTelegramId } from '@/lib/phantom';
import { BattleSoundProvider, SoundToggle } from '@/components/wallet-wars/SoundToggle';
import { buildRecapShareText } from '@/components/wallet-wars/battle/BattleRecapCard';
import { ShareButton } from '@/components/ShareButton';
import { PixelArrowLeft } from '@/components/PixelArt';

interface BattlePayload {
  battleId: string;
  challenger: FighterCardData & { stats?: unknown };
  opponent: FighterCardData & { stats?: unknown };
  resolution: BattleResolution;
  challengerWon: boolean;
  isTie?: boolean;
  pointsAwarded: number;
  pointsBefore?: number;
  winStreak?: number;
  taunt?: string | null;
  opponentTaunt?: string | null;
  battleMode?: 'normal' | 'boss';
  bossSlug?: string;
  bossName?: string;
  bossTitle?: string;
  bossIntroLine?: string;
  bossTier?: string;
  becameChampion?: boolean;
}

function snapshotToCard(s: BattlePayload['challenger']): FighterCardData {
  const stats = (s as {
    stats?: {
      strike: number;
      shield: number;
      power: number;
      armor: number;
      agility: number;
    };
  }).stats;
  return {
    name: s.name,
    walletAddress: s.walletAddress,
    avatarUrl: s.avatarUrl,
    strike: stats?.strike ?? s.strike,
    shield: stats?.shield ?? s.shield,
    power: stats?.power ?? s.power,
    armor: stats?.armor ?? s.armor ?? 0,
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
  const isBossBattle = payload.battleMode === 'boss';
  const bossMeta =
    isBossBattle && payload.bossName
      ? {
          name: payload.bossName,
          title: payload.bossTitle ?? 'Boss',
          introLine: payload.bossIntroLine ?? 'Prepare yourself.',
          tier: payload.bossTier ?? 'epic',
        }
      : null;

  if (done) {
    const shareText = buildRecapShareText(
      challenger,
      opponent,
      payload.resolution,
      payload.challengerWon,
      payload.isTie ?? false
    );
    const resultUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/wallet-wars/result/${payload.battleId}`;

    return (
      <main className="mx-auto max-w-2xl px-4 py-8 text-center">
        <FighterCard
          fighter={payload.isTie ? challenger : payload.challengerWon ? challenger : opponent}
          variant="profile"
          className="mx-auto mb-6 max-w-[240px]"
        />
        <p className="font-pixel text-phosphor">
          {payload.isTie ? 'DRAW' : payload.challengerWon ? 'YOU WIN' : 'YOU LOSE'}
        </p>
        {isBossBattle && payload.challengerWon && payload.bossSlug === 'toly' && (
          <p className="mt-2 font-pixel text-[10px] text-amber glow-amber">
            GAUNTLET CHAMPION — YOU DEFEATED TOLY
          </p>
        )}
        {isBossBattle && payload.challengerWon && payload.becameChampion && payload.bossSlug !== 'toly' && (
          <p className="mt-2 font-term text-sm text-phosphor">Boss defeated. Next challenger awaits.</p>
        )}
        <p className="mt-2 font-term text-amber">+{payload.pointsAwarded} points</p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <ShareButton
            url={resultUrl}
            text={
              isBossBattle
                ? `I just battled ${payload.bossName ?? 'a boss'} in Boss Gauntlet on GleanAI!`
                : 'I just fought in Wallet Wars on GleanAI!'
            }
            twitterText={shareText}
          />
          {isBossBattle ? (
            <Link href="/wallet-wars/boss-gauntlet" className="arcade-btn">
              {payload.becameChampion ? 'GAUNTLET HALL' : 'NEXT BOSS'}
            </Link>
          ) : (
            <Link href="/wallet-wars" className="arcade-btn">
              AGAIN
            </Link>
          )}
        </div>
      </main>
    );
  }

  return (
    <BattleSoundProvider>
      <main className="mx-auto max-w-lg px-2 py-4">
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
          isTie={payload.isTie ?? false}
          pointsAwarded={payload.pointsAwarded}
          pointsBefore={payload.pointsBefore ?? 0}
          winStreak={payload.winStreak ?? 0}
          taunt={payload.taunt}
          opponentTaunt={payload.opponentTaunt}
          battleId={payload.battleId}
          battleMode={isBossBattle ? 'boss' : 'normal'}
          bossMeta={bossMeta}
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
