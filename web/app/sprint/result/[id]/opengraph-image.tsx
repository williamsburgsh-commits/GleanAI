import { ImageResponse } from 'next/og';
import { getServiceClient } from '@/lib/supabaseServer';
import { getSprintRun } from '@/lib/sprint.server';
import { formatDuration } from '@/lib/format';

// The edge runtime avoids a Windows-only @vercel/og font path bug present in
// the nodejs runtime (ERR_INVALID_URL on the bundled noto-sans font), and is
// also the recommended runtime for OG image generation in production.
export const runtime = 'edge';
export const alt = 'GleanAI Solana Sprint result';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({ params }: { params: { id: string } }) {
  let durationLabel = '--';
  let actions = 5;
  try {
    const supabase = getServiceClient();
    const run = await getSprintRun(supabase, params.id);
    if (run?.duration_ms) durationLabel = formatDuration(run.duration_ms);
    if (run) actions = run.actions_completed;
  } catch {
    /* fall back to placeholders */
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#05060a',
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(57,255,122,0.18), transparent 60%)',
          color: '#e7ece5',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            fontSize: 30,
            letterSpacing: 12,
            color: '#7d8694',
            textTransform: 'uppercase',
          }}
        >
          GleanAI // Solana Sprint
        </div>
        <div
          style={{
            fontSize: 56,
            marginTop: 24,
            color: '#7d8694',
            letterSpacing: 6,
          }}
        >
          ONBOARDED IN
        </div>
        <div
          style={{
            fontSize: 200,
            fontWeight: 800,
            color: '#39ff7a',
            lineHeight: 1.1,
          }}
        >
          {durationLabel}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 34,
            color: '#ffb347',
            letterSpacing: 4,
          }}
        >
          {`${actions}/5 ACTIONS · SPEEDRUN SOLANA`}
        </div>
      </div>
    ),
    { ...size }
  );
}
