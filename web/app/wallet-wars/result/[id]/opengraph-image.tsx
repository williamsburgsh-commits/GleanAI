import { ImageResponse } from 'next/og';
import { getServiceClient } from '@/lib/supabaseServer';
import { isBossSlug, BOSSES, type BossSlug } from '@/lib/wallet-wars/bosses';
import { BOSS_PORTRAIT_DATA_URL } from '@/lib/wallet-wars/bossPortraitData';

export const runtime = 'edge';
export const alt = 'GleanAI Wallet Wars Battle';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type StatRound = { winner?: string };

function shortWallet(addr: string | null | undefined): string {
  if (!addr || addr.length < 8) return 'YOU';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function scoreFromRounds(rounds: StatRound[]): { c: number; o: number } {
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

async function loadBattle(id: string) {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('battles')
      .select(
        'id, winner_id, challenger_id, opponent_id, bot_name, boss_slug, points_awarded, opponent_type, stat_results'
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

async function loadWalletForUser(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('fighter_cards')
      .select('wallet_address')
      .eq('user_id', userId)
      .maybeSingle();
    return data?.wallet_address ?? null;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: { id: string } }) {
  const battle = await loadBattle(params.id);
  const isBoss = battle?.opponent_type === 'boss' || Boolean(battle?.boss_slug);
  const rounds = (battle?.stat_results as StatRound[]) ?? [];
  const { c: challengerWins, o: opponentWins } = scoreFromRounds(rounds);
  const score = `${challengerWins}-${opponentWins}`;

  const { challengerWon, isTie } = resolveOutcome(
    battle?.winner_id,
    battle?.challenger_id,
    challengerWins,
    opponentWins
  );
  const challengerLost = !isTie && !challengerWon;

  const challengerWallet = await loadWalletForUser(battle?.challenger_id);
  const opponentWallet = await loadWalletForUser(battle?.opponent_id);

  const bossSlug = battle?.boss_slug;
  const bossDef =
    bossSlug && isBossSlug(bossSlug) ? BOSSES[bossSlug as BossSlug] : null;
  const bossName = battle?.bot_name ?? bossDef?.name ?? 'Boss';

  const leftName = shortWallet(challengerWallet);
  const rightName =
    isBoss || battle?.opponent_type === 'bot'
      ? (battle?.bot_name ?? 'OPPONENT').toUpperCase()
      : shortWallet(opponentWallet);

  let headline = 'BATTLE RESULT';
  let headlineColor = '#e7ece5';
  if (isTie) {
    headline = 'DRAW';
    headlineColor = '#ffb347';
  } else if (isBoss) {
    if (challengerWon) {
      headline = `DEFEATED ${bossName.toUpperCase()}`;
      headlineColor = '#39ff7a';
    } else {
      headline = `${bossName.toUpperCase()} WINS`;
      headlineColor = '#ff3da6';
    }
  } else if (challengerWon) {
    headline = 'VICTORY';
    headlineColor = '#39ff7a';
  } else if (challengerLost) {
    headline = 'DEFEAT';
    headlineColor = '#ff3da6';
  }

  const points = battle?.points_awarded ?? 0;
  const subline = isBoss ? 'BOSS GAUNTLET · GLEANAI' : 'WALLET WARS · GLEANAI';
  const accent = isBoss
    ? 'radial-gradient(circle at 50% 0%, rgba(255,61,166,0.22), transparent 60%)'
    : 'radial-gradient(circle at 50% 0%, rgba(39,255,125,0.18), transparent 60%)';

  const portraitSrc =
    isBoss && bossSlug ? BOSS_PORTRAIT_DATA_URL[bossSlug] ?? null : null;

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
          backgroundImage: accent,
          color: '#e7ece5',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 8,
            color: '#7d8694',
            textTransform: 'uppercase',
            display: 'flex',
          }}
        >
          {subline}
        </div>

        <div
          style={{
            fontSize: headline.length > 22 ? 52 : 68,
            fontWeight: 800,
            marginTop: 20,
            color: headlineColor,
            lineHeight: 1.1,
            textAlign: 'center',
            padding: '0 48px',
            display: 'flex',
          }}
        >
          {headline}
        </div>

        {portraitSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portraitSrc}
            width={112}
            height={112}
            alt=""
            style={{
              marginTop: 20,
              border: '4px solid rgba(255,61,166,0.55)',
              backgroundColor: '#0d1219',
            }}
          />
        ) : null}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            marginTop: portraitSrc ? 18 : 28,
            fontSize: 28,
            letterSpacing: 2,
          }}
        >
          <div style={{ color: '#39ff7a', display: 'flex' }}>{leftName}</div>
          <div style={{ color: '#7d8694', fontSize: 22, display: 'flex' }}>VS</div>
          <div style={{ color: isBoss ? '#ff3da6' : '#2bd9ff', display: 'flex' }}>
            {rightName}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            marginTop: 24,
          }}
        >
          <div style={{ fontSize: 40, color: '#e7ece5', display: 'flex' }}>{score}</div>
          <div style={{ fontSize: 32, color: '#ffb347', display: 'flex' }}>
            +{points} PTS
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 22,
            color: '#7d8694',
            letterSpacing: 4,
            display: 'flex',
          }}
        >
          gleanai.xyz
        </div>
      </div>
    ),
    { ...size }
  );
}
