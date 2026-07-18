import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/adminAuth';
import { getServiceClient } from '@/lib/supabaseServer';
import { publishClaimEpoch } from '@/lib/claims/publish.server';

export const runtime = 'nodejs';

// POST /api/admin/claims/publish { epochSlug? }
export async function POST(request: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: { epochSlug?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* empty ok */
  }

  try {
    const supabase = getServiceClient();
    const epoch = await publishClaimEpoch(supabase, { epochSlug: body.epochSlug ?? null });
    return NextResponse.json({ ok: true, epoch });
  } catch (err) {
    console.error('[api/admin/claims/publish] error', err);
    const message = err instanceof Error ? err.message : 'Could not publish claim epoch.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
