import { createClient } from '@supabase/supabase-js';

function cleanEnv(value: string | undefined): string {
  return (value ?? '').trim().replace(/^["']|["']$/g, '');
}

export function getSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url =
    cleanEnv(process.env.SUPABASE_URL) ||
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return { url, serviceRoleKey };
}

export function getServiceRoleFromJwt(key: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(key.split('.')[1] ?? '', 'base64url').toString('utf8')
    ) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

// Server-only Supabase client using the service-role key. NEVER import this
// into a client component. It bypasses RLS, so it must stay on the server.
export function getServiceClient() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const role = getServiceRoleFromJwt(serviceRoleKey);
  if (role && role !== 'service_role') {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY has role "${role}" — paste the service_role secret from Supabase, not the anon key.`
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
