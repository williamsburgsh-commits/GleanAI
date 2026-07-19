import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { syncWebhookAddresses } from '@/lib/helius/addresses.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/admin/helius/sync-wallets
// Push all linked user wallets into the Helius webhook address list.
export async function POST() {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('users')
      .select('wallet_address')
      .not('wallet_address', 'is', null);
    if (error) throw error;

    const addresses = (data ?? [])
      .map((r) => (r.wallet_address as string | null)?.trim() ?? '')
      .filter(Boolean);

    const result = await syncWebhookAddresses(addresses);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    console.error('[api/admin/helius/sync-wallets]', err);
    return NextResponse.json({ error: 'Sync failed.' }, { status: 500 });
  }
}
