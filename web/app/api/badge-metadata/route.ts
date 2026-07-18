import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import { GLEAN_BADGE_NAME, GLEAN_BADGE_SYMBOL } from '@/lib/solana/programs';
import { fighterAvatarPngUrl } from '@/lib/wallet-wars/avatar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function appBaseUrl(request: Request): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_WEB_APP_URL?.trim() ||
    process.env.WEB_APP_URL?.trim() ||
    '';
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return new URL(request.url).origin;
}

/** Metaplex off-chain metadata for a scanned fighter badge. */
export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get('wallet')?.trim() ?? '';
  if (!wallet || wallet.length < 32 || wallet.length > 64) {
    return NextResponse.json({ error: 'A valid wallet query is required.' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    const { data: fighter, error } = await supabase
      .from('fighter_cards')
      .select(
        'wallet_address, shield, power, strike, armor, agility, total_score, rarity, avatar_url'
      )
      .eq('wallet_address', wallet)
      .maybeSingle();
    if (error) throw error;
    if (!fighter) {
      return NextResponse.json(
        { error: 'Scan your fighter in Wallet Wars before minting a badge.' },
        { status: 404 }
      );
    }

    const rarity = String(fighter.rarity);
    const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1);
    const base = appBaseUrl(request);
    const image =
      typeof fighter.avatar_url === 'string' && fighter.avatar_url.includes('/png')
        ? fighter.avatar_url
        : fighterAvatarPngUrl(fighter.wallet_address);

    const body = {
      name: `${GLEAN_BADGE_NAME} · ${rarityLabel}`,
      symbol: GLEAN_BADGE_SYMBOL,
      description:
        'Official Wallet Wars fighter credential minted on GleanAI. Stats reflect on-chain activity at mint time.',
      image,
      external_url: `${base}/wallet-wars`,
      attributes: [
        { trait_type: 'Game', value: 'Wallet Wars' },
        { trait_type: 'Rarity', value: rarityLabel },
        { trait_type: 'Power', value: Number(fighter.power) || 0 },
        { trait_type: 'Shield', value: Number(fighter.shield) || 0 },
        { trait_type: 'Strike', value: Number(fighter.strike) || 0 },
        { trait_type: 'Armor', value: Number(fighter.armor) || 0 },
        { trait_type: 'Agility', value: Number(fighter.agility) || 0 },
        { trait_type: 'Total Score', value: Number(fighter.total_score) || 0 },
        { trait_type: 'Network', value: process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet' },
      ],
      properties: {
        category: 'image',
        files: [{ uri: image, type: 'image/png' }],
      },
    };

    return NextResponse.json(body, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('[api/badge-metadata]', err);
    return NextResponse.json({ error: 'Could not load badge metadata.' }, { status: 500 });
  }
}
