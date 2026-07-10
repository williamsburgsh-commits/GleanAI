import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CrtPanel } from '@/components/CrtPanel';
import { ShareButton } from '@/components/ShareButton';
import { getServiceClient } from '@/lib/supabaseServer';
import { buildRecapShareText } from '@/lib/wallet-wars/buildRecapShareText';
import { bossChallengeBlinkUrl } from '@/lib/actions/blinkUrl';
import { getPublicWebAppUrl } from '@/lib/publicWebAppUrl';
import { PixelTrophy } from '@/components/PixelArt';

export const runtime = 'nodejs';

async function loadBattle(id: string) {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('battles')
      .select(
        'id, winner_id, challenger_id, opponent_id, bot_name, boss_slug, opponent_type, points_awarded, stat_results'
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[wallet-wars/result] load error', err);
    return null;
  }
}

function scoreFromRounds(rounds: { winner?: string }[]): { c: number; o: number } {
  let c = 0;
  let o = 0;
  for (const r of rounds) {
    if (r.winner === 'challenger') c += 1;
    else if (r.winner === 'opponent') o += 1;
  }
  return { c, o };
}

/** Boss losses store winner_id=null (same as ties) — prefer score when ambiguous. */
function resolveOutcome(
  winnerId: string | null | undefined,
  challengerId: string | null | undefined,
  c: number,
  o: number
): { challengerWon: boolean; isTie: boolean } {
  if (winnerId && challengerId && winnerId === challengerId) {
    return { challengerWon: true, isTie: false };
  }
  if (winnerId && challengerId && winnerId !== challengerId) {
    return { challengerWon: false, isTie: false };
  }
  if (c === o) return { challengerWon: false, isTie: true };
  return { challengerWon: c > o, isTie: false };
}

function outcomeLabel(opts: {
  isBoss: boolean;
  bossName: string | null;
  challengerWon: boolean;
  isTie: boolean;
}): string {
  if (opts.isTie) return 'Draw';
  if (opts.isBoss && opts.bossName) {
    return opts.challengerWon
      ? `Defeated ${opts.bossName}`
      : `${opts.bossName} wins`;
  }
  return opts.challengerWon ? 'Victory' : 'Defeat';
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const battle = await loadBattle(params.id);
  const isBoss = battle?.opponent_type === 'boss' || Boolean(battle?.boss_slug);
  const bossName = battle?.bot_name ?? 'Boss';
  const rounds = (battle?.stat_results as { winner?: string }[]) ?? [];
  const { c, o } = scoreFromRounds(rounds);
  const { challengerWon, isTie } = resolveOutcome(
    battle?.winner_id,
    battle?.challenger_id,
    c,
    o
  );
  const outcome = outcomeLabel({
    isBoss,
    bossName: battle?.bot_name ?? null,
    challengerWon,
    isTie,
  });

  const title = isBoss
    ? `${outcome} — Boss Gauntlet — GleanAI`
    : `${outcome} — Wallet Wars — GleanAI`;
  const description = isBoss
    ? `Boss Gauntlet vs ${bossName} on GleanAI.`
    : 'See who won this Wallet Wars duel on GleanAI.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`/wallet-wars/result/${params.id}/opengraph-image`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function BattleResultPage({
  params,
}: {
  params: { id: string };
}) {
  const battle = await loadBattle(params.id);
  if (!battle) notFound();

  const rounds = (battle.stat_results as { stat: string; winner: string }[]) ?? [];
  const { c, o } = scoreFromRounds(rounds);
  const { challengerWon, isTie } = resolveOutcome(
    battle.winner_id,
    battle.challenger_id,
    c,
    o
  );
  const isBoss = battle.opponent_type === 'boss' || Boolean(battle.boss_slug);
  const outcome = outcomeLabel({
    isBoss,
    bossName: battle.bot_name,
    challengerWon,
    isTie,
  });

  const resultUrl = `${getPublicWebAppUrl()}/wallet-wars/result/${params.id}`;
  const shareText = buildRecapShareText({
    mode: isBoss ? 'boss' : 'pvp',
    bossName: battle.bot_name,
    opponentName: battle.bot_name,
    challengerWon,
    isTie,
    challengerWins: c,
    opponentWins: o,
    resultUrl,
    blinkUrl: isBoss
      ? bossChallengeBlinkUrl(battle.boss_slug || 'gatekeeper')
      : undefined,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <CrtPanel label={isBoss ? 'BOSS GAUNTLET // RESULT' : 'WALLET WARS // RESULT'} tone="phosphor">
        <div className="space-y-6 py-4 text-center">
          <div className="mx-auto h-12 w-12 text-amber">
            <PixelTrophy />
          </div>
          <p className="font-pixel text-lg text-phosphor">
            {isBoss && battle.bot_name
              ? `vs ${battle.bot_name}`
              : battle.bot_name
                ? `vs ${battle.bot_name}`
                : 'PLAYER DUEL'}
          </p>
          <p className="font-term text-bone">
            {outcome} · {rounds.length} stat rounds · +{battle.points_awarded} pts
          </p>
          <ShareButton
            variant="compact"
            url={resultUrl}
            text={
              isBoss
                ? `I just fought ${battle.bot_name ?? 'a boss'} in Boss Gauntlet on GleanAI.`
                : 'I just fought in Wallet Wars on GleanAI.'
            }
            twitterText={shareText}
          />
          <Link
            href={isBoss ? '/wallet-wars/boss-gauntlet' : '/wallet-wars'}
            className="font-term text-cyan underline"
          >
            {isBoss ? 'back to gauntlet' : 'back to arena'}
          </Link>
        </div>
      </CrtPanel>
      <p className="mt-4 text-center font-term text-xs text-ash">
        Battle #{params.id.slice(0, 8)}
      </p>
    </main>
  );
}
