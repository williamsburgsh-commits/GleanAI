import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CrtPanel } from '@/components/CrtPanel';
import { ShareButton } from '@/components/ShareButton';
import { getServiceClient } from '@/lib/supabaseServer';
import { getSprintRun, getSprintRank } from '@/lib/sprint.server';
import { formatDuration, onboardedPhrase } from '@/lib/format';

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
          <div className="text-[10px] uppercase tracking-[0.4em] text-ash">
            onboarded in
          </div>
          <div className="font-display text-5xl text-phosphor glow-text sm:text-6xl">
            {formatDuration(run.duration_ms)}
          </div>

          <div className="mx-auto flex max-w-xs items-center justify-center gap-6">
            <div>
              <div className="font-display text-base text-amber glow-text">
                {run.actions_completed}/5
              </div>
              <div className="text-[9px] uppercase tracking-[0.3em] text-ash">
                actions
              </div>
            </div>
            <div className="h-8 w-px bg-grid" />
            <div>
              <div className="font-display text-base text-magenta glow-magenta">
                {rank ? `#${rank}` : '--'}
              </div>
              <div className="text-[9px] uppercase tracking-[0.3em] text-ash">
                {total ? `of ${total}` : 'rank'}
              </div>
            </div>
          </div>

          <p className="text-sm text-bone">{onboardedPhrase(run.duration_ms)}</p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <ShareButton
              url={run.result_card_url || ''}
              text={`I onboarded to Solana in ${formatDuration(run.duration_ms)}!`}
            />
            <Link
              href="/sprint"
              className="text-[11px] uppercase tracking-[0.25em] text-cyan underline"
            >
              run your own
            </Link>
          </div>
        </div>
      </CrtPanel>

      <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-ash">
        gleanai · speedrun solana
      </p>
    </main>
  );
}
