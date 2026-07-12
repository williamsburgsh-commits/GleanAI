import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';
import { getReferralInfo } from '@/lib/points/referralInfo.server';

export const runtime = 'nodejs';

// GET /api/referral?telegramId=123
export async function GET(request: Request) {
  const telegramId = new URL(request.url).searchParams.get('telegramId')?.trim() ?? '';
  if (!telegramId || !/^\d+$/.test(telegramId)) {
    return NextResponse.json({ error: 'A valid telegramId is required.' }, { status: 400 });
  }

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('[api/referral] config error', err);
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const info = await getReferralInfo(supabase, telegramId);
    if (!info) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    return NextResponse.json(info);
  } catch (err) {
    console.error('[api/referral] error', err);
    return NextResponse.json({ error: 'Could not load referral info.' }, { status: 500 });
  }
}
