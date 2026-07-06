import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CrtPanel } from '@/components/CrtPanel';
import { ShareButton } from '@/components/ShareButton';
import { getServiceClient } from '@/lib/supabaseServer';
import { getSprintRun, getSprintRank } from '@/lib/sprint.server';
import { formatDuration, onboardedPhrase } from '@/lib/format';
import { PixelStar, PixelTrophy } from '@/components/PixelArt';

export const runtime = 'nodejs';

async function loadRun(id: string) {
  try {
    const supabase = getServiceClient();
    return await getSprintRun(supabase, id);
  } catch (err) {
    console.error('[sprint/result] load error', err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const run = await loadRun(params.id);
  if (!run || !run.duration_ms) {
    return { title: 'GleanAI // Solana Sprint' };
  }
  const phrase = onboardedPhrase(run.duration_ms);
  return {
    title: `${phrase} - GleanAI`,
    description: 'Speedrun your Solana onboarding with GleanAI.',
    openGraph: {
      title: phrase,
      description: 'Speedrun your Solana onboarding with GleanAI.',
    },
    twitter: {
      card: 'summary_large_image',
      title: phrase,
      description: 'Speedrun your Solana onboarding with GleanAI.',
    },
  };
}

export default async function SprintResult({
  params,
}: {
  params: { id: string };
}) {
  const run = await loadRun(params.id);
  if (!run || !run.duration_ms) notFound();

  const supabase = getServiceClient();
  let rank: number | null = null;
  let total = 0;
  try {
    const r = await getSprintRank(supabase, run.duration_ms);
    rank = r.rank;
    total = r.total;
  } catch {
    /* ranking is best-effort */
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
      <CrtPanel label="SOLANA SPRINT // RESULT" tone="phosphor">
        <div className="space-y-6 py-4 text-center">
          <div className="mx-auto h-12 w-12 text-amber glow-amber">
            <PixelTrophy />
          </div>
          <div className="font-term text-[16px] uppercase tracking-[0.3em] text-ash">
            onboarded in
          </div>
          <div className="font-pixel text-4xl text-phosphor glow-text sm:text-6xl">
            {formatDuration(run.duration_ms)}
          </div>

          <div className="mx-auto flex max-w-xs items-center justify-center gap-6">
            <div>
              <div className="flex items-center justify-center gap-1 font-pixel text-[13px] text-amber glow-amber">
                <span className="h-3 w-3"><PixelStar /></span>
                {run.actions_completed}/5
              </div>
              <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">
                actions
              </div>
            </div>
            <div className="h-8 w-px bg-grid" />
            <div>
              <div className="font-pixel text-[13px] text-magenta glow-magenta">
                {rank ? `#${rank}` : '--'}
              </div>
              <div className="mt-1 font-term text-[14px] uppercase tracking-[0.2em] text-ash">
                {total ? `of ${total}` : 'rank'}
              </div>
            </div>
          </div>

          <p className="font-term text-[18px] text-bone">{onboardedPhrase(run.duration_ms)}</p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <ShareButton
              url={run.result_card_url || ''}
              text={`I onboarded to Solana in ${formatDuration(run.duration_ms)}!`}
            />
            <Link
              href="/sprint"
              className="font-term text-[16px] uppercase tracking-[0.1em] text-cyan underline"
            >
              run your own
            </Link>
          </div>
        </div>
      </CrtPanel>

      <p className="mt-6 text-center font-term text-[14px] uppercase tracking-[0.2em] text-ash">
        gleanai · speedrun solana
      </p>
    </main>
  );
}
