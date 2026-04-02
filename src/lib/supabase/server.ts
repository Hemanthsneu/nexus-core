import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _serverClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client.
 * Uses the service role key when available (bypasses RLS), falling back to
 * the anon key for environments that don't have the service role configured yet.
 *
 * This separation lets us add RLS policies in a future migration without
 * breaking existing server-side API routes.
 */
export function getServerSupabase(): SupabaseClient {
  if (_serverClient) return _serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const key = serviceKey || anonKey;
  if (!url || !key) {
    throw new Error('Missing Supabase URL or key for server client');
  }

  _serverClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _serverClient;
}
