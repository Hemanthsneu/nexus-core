import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Browser-safe Supabase client with cookie-based auth session handling.
 * Uses @supabase/ssr so Supabase Auth sessions persist across page loads.
 * RLS policies scope queries to auth.uid() automatically.
 */
export function getBrowserSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  _client = createBrowserClient(url, key);
  return _client;
}

/**
 * Lazy proxy for backward-compatible import.
 * Defers client creation until first property access.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getBrowserSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return (value as Function).bind(client);
    }
    return value;
  },
});
