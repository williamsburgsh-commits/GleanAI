import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/stats — public aggregate counts for the landing page live panel.
export async function GET() {
  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('[api/stats] config error', err);
    return NextResponse.json({ error: 'Server is misconfigured.' }, { status: 500 });
  }

  try {
    const [wallets, quests] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('quest_completions').select('id', { count: 'exact', head: true }),
    ]);

    if (wallets.error) throw wallets.error;
    if (quests.error) throw quests.error;

    return NextResponse.json({
      walletsConnected: wallets.count ?? 0,
      questsCompleted: quests.count ?? 0,
      avgTxFee: '< $0.001',
    });
  } catch (err) {
    console.error('[api/stats] error', err);
    return NextResponse.json({ error: 'Could not load stats.' }, { status: 500 });
  }
}
