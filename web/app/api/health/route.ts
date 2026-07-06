import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getServiceRoleFromJwt,
  getSupabaseConfig,
} from '@/lib/supabaseServer';

export const runtime = 'nodejs';

// GET /api/health — safe Supabase connectivity check (no secrets returned).
export async function GET() {
  let url = '';
  let key = '';
  try {
    ({ url, serviceRoleKey: key } = getSupabaseConfig());
  } catch (err) {
    return NextResponse.json({
      ok: false,
      stage: 'config',
      error: err instanceof Error ? err.message : 'Missing Supabase env.',
    });
  }

  const jwtRole = getServiceRoleFromJwt(key);
  if (jwtRole && jwtRole !== 'service_role') {
    return NextResponse.json({
      ok: false,
      stage: 'config',
      error: `SUPABASE_SERVICE_ROLE_KEY is the ${jwtRole} key. Use service_role from Supabase Dashboard → Settings → API.`,
      supabaseHost: new URL(url).hostname,
    });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: questErr } = await supabase.from('quests').select('id').limit(1);
  if (questErr) {
    return NextResponse.json({
      ok: false,
      stage: 'supabase',
      error: questErr.message,
      hint: questErr.message.includes('Invalid API key')
        ? 'Re-copy the service_role key with no quotes or trailing spaces, then redeploy.'
        : undefined,
      supabaseHost: new URL(url).hostname,
      jwtRole,
    });
  }

  return NextResponse.json({
    ok: true,
    supabaseHost: new URL(url).hostname,
    jwtRole: jwtRole ?? 'service_role',
  });
}
