import { ImageResponse } from 'next/og';
import { getServiceClient } from '@/lib/supabaseServer';

export const runtime = 'edge';
export const alt = 'GleanAI Wallet Wars Battle';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadBattle(id: string) {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('battles')
      .select('id, winner_id, challenger_id, bot_name, boss_slug, points_awarded, opponent_type')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: { id: string } }) {
  const battle = await loadBattle(params.id);
  const isBoss = battle?.opponent_type === 'boss' || Boolean(battle?.boss_slug);
  const bossName = battle?.bot_name ?? 'Boss';
  const won = Boolean(battle?.winner_id);
  const points = battle?.points_awarded ?? 0;

  const headline = isBoss
    ? won
      ? `DEFEATED ${bossName.toUpperCase()}`
      : `${bossName.toUpperCase()} WINS`
    : won
      ? 'VICTORY'
      : 'BATTLE RESULT';

  const subline = isBoss ? 'BOSS GAUNTLET · GLEANAI' : 'WALLET WARS · GLEANAI';

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
          backgroundImage: isBoss
            ? 'radial-gradient(circle at 50% 0%, rgba(255,61,166,0.22), transparent 60%)'
            : 'radial-gradient(circle at 50% 0%, rgba(39,255,125,0.18), transparent 60%)',
          color: '#e7ece5',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 8,
            color: '#7d8694',
            textTransform: 'uppercase',
          }}
        >
          {subline}
        </div>
        <div
          style={{
            fontSize: won ? 72 : 64,
            fontWeight: 800,
            marginTop: 24,
            color: won ? '#39ff7a' : '#ff3da6',
            lineHeight: 1.1,
            textAlign: 'center',
            padding: '0 40px',
          }}
        >
          {headline}
        </div>
        <div
          style={{
            fontSize: 36,
            marginTop: 28,
            color: '#ffb347',
          }}
        >
          +{points} PTS
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 22,
            color: '#7d8694',
            letterSpacing: 4,
          }}
        >
          gleanai.xyz
        </div>
      </div>
    ),
    { ...size }
  );
}
