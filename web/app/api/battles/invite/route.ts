import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import { getUserByTelegramIdFull } from '@/lib/wallet-wars/fighter.server';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { telegramId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const telegramId = (body.telegramId || '').toString().trim();
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ error: 'telegramId is required.' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch {
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const user = await getUserByTelegramIdFull(supabase, telegramId);
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    const code = randomBytes(6).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 3_600_000).toISOString();

    const { data, error } = await supabase
      .from('battle_invites')
      .insert({
        code,
        creator_id: user.id,
        expires_at: expiresAt,
      })
      .select('code, expires_at')
      .single();
    if (error) throw error;

    const baseUrl =
      process.env.WEB_APP_URL?.replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_WEB_APP_URL?.replace(/\/$/, '') ||
      '';
    // Do not append &tg= — that is the creator's id. Friends who open the link
    // would get it written into localStorage and then fail accept as "yourself".
    const shareUrl = `${baseUrl}/wallet-wars/battle?invite=${data.code}`;

    return NextResponse.json({
      code: data.code,
      expiresAt: data.expires_at,
      shareUrl,
    });
  } catch (err) {
    console.error('[api/battles/invite]', err);
    return NextResponse.json({ error: 'Could not create invite.' }, { status: 500 });
  }
}
