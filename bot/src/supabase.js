import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Server-side client using the service-role key. This bypasses RLS, so it must
// NEVER be exposed to clients. The bot is a trusted backend service.
export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);
