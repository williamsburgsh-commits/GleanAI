import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CrtPanel } from '@/components/CrtPanel';
import { ShareButton } from '@/components/ShareButton';
import { getServiceClient } from '@/lib/supabaseServer';
import { PixelTrophy } from '@/components/PixelArt';

export const runtime = 'nodejs';

async function loadBattle(id: string) {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('battles')
      .select('id, winner_id, challenger_id, opponent_id, bot_name, boss_slug, opponent_type, points_awarded, stat_results')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[wallet-wars/result] load error', err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const battle = await loadBattle(params.id);
  const isBoss = battle?.opponent_type === 'boss' || Boolean(battle?.boss_slug);
  return {
    title: isBoss
      ? `Boss Gauntlet vs ${battle?.bot_name ?? 'Boss'} — GleanAI`
      : 'Wallet Wars Battle Result — GleanAI',
    description: isBoss
      ? `Boss Gauntlet battle result on GleanAI.`
      : 'See who won this Wallet Wars duel on GleanAI.',
    openGraph: {
      images: [`/wallet-wars/result/${params.id}/opengraph-image`],
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
  const won = Boolean(battle.winner_id);
  const isBoss = battle.opponent_type === 'boss' || Boolean(battle.boss_slug);

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
            {won ? 'Victory' : 'Defeat'} · {rounds.length} stat rounds · +{battle.points_awarded} pts
          </p>
          <ShareButton
            url={`${process.env.WEB_APP_URL || ''}/wallet-wars/result/${params.id}`}
            text={
              isBoss
                ? `Boss Gauntlet battle vs ${battle.bot_name ?? 'boss'} on GleanAI!`
                : 'I just fought in Wallet Wars on GleanAI!'
            }
          />
          <Link href={isBoss ? '/wallet-wars/boss-gauntlet' : '/wallet-wars'} className="font-term text-cyan underline">
            {isBoss ? 'back to gauntlet' : 'back to arena'}
          </Link>
        </div>
      </CrtPanel>
      {!won && (
        <p className="mt-4 text-center font-term text-xs text-ash">
          Battle #{params.id.slice(0, 8)}
        </p>
      )}
    </main>
  );
}
