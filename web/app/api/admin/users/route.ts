import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

// GET /api/admin/users?query=  -> top users by points, optional search by
// telegram username / id / wallet. Used to pick reward recipients.
export async function GET(request: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('query') || '').trim();

  try {
    const supabase = getServiceClient();
    let query = supabase
      .from('users')
      .select('id, telegram_id, telegram_username, wallet_address, points')
      .order('points', { ascending: false })
      .limit(20);

    if (q) {
      const escaped = q.replace(/[%,]/g, '');
      const ors = [`telegram_username.ilike.%${escaped}%`];
      if (/^\d+$/.test(escaped)) ors.push(`telegram_id.eq.${escaped}`);
      if (escaped.length >= 3) ors.push(`wallet_address.ilike.%${escaped}%`);
      query = query.or(ors.join(','));
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ users: data ?? [] });
  } catch (err) {
    console.error('[api/admin/users] error', err);
    return NextResponse.json({ error: 'Could not load users.' }, { status: 500 });
  }
}
