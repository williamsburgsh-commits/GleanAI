import { NextResponse } from 'next/server';
import { verifyInitData } from '@/lib/telegram';
import { getServiceClient } from '@/lib/supabaseServer';
import { getOrCreateUserByTelegramId } from '@/lib/users.server';

export const runtime = 'nodejs';

// POST /api/auth { initData }
// Verifies Telegram Mini App initData, then returns the player's session.
// This is the secure replacement for the ?tg= query param.
export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!botToken) {
    return NextResponse.json(
      { error: 'Server is missing TELEGRAM_BOT_TOKEN.' },
      { status: 503 }
    );
  }

  let body: { initData?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const verified = verifyInitData(body.initData || '', botToken);
  if (!verified) {
    return NextResponse.json(
      { error: 'Invalid or expired Telegram session.' },
      { status: 401 }
    );
  }

  try {
    const supabase = getServiceClient();
    const telegramId = verified.telegramId;
    const username = verified.user.username ?? null;
    const user = await getOrCreateUserByTelegramId(supabase, telegramId, {
      username,
    });

    return NextResponse.json({
      ok: true,
      player: {
        telegramId,
        username,
        firstName: verified.user.first_name ?? null,
        walletAddress: user.wallet_address,
        points: user.points,
      },
    });
  } catch (err) {
    console.error('[api/auth] error', err);
    const detail =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: string }).message)
        : err instanceof Error
          ? err.message
          : 'unknown';
    const hint =
      detail.includes('SUPABASE') || detail.includes('service_role')
        ? ' Check Vercel env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        : detail.includes('TELEGRAM')
          ? ' Check Vercel env: TELEGRAM_BOT_TOKEN must match your bot.'
          : '';
    return NextResponse.json(
      {
        error: 'Could not sign you in.',
        ...(process.env.NODE_ENV !== 'production' ? { detail: detail + hint } : {}),
      },
      { status: 500 }
    );
  }
}
