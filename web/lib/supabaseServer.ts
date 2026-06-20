import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client using the service-role key. NEVER import this
// into a client component. It bypasses RLS, so it must stay on the server.
export function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the server environment.'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
