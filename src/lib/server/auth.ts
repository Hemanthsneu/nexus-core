import { getServerSupabase } from '@/lib/supabase/server';
import { getAuthSupabase } from '@/lib/supabase/server';
import { UnauthorizedError } from './errors';
import type { Middleware } from './middleware';

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validates a Bearer API key against the api_keys table.
 * Returns the user_id if valid, null otherwise.
 * Updates last_used_at as a side effect.
 */
async function validateApiKey(rawKey: string): Promise<string | null> {
  const hash = await sha256(rawKey);
  const db = getServerSupabase();

  const { data } = await db
    .from('api_keys')
    .select('id, user_id')
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .single();

  if (!data) return null;

  // Non-blocking last_used_at update
  void db
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return data.user_id;
}

/**
 * Validates the Supabase Auth session from request cookies.
 * Returns the user id if a valid session exists, null otherwise.
 */
async function validateSession(): Promise<string | null> {
  try {
    const supabase = await getAuthSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Route-level auth middleware.
 * Checks for (in order):
 *   1. Authorization: Bearer <api_key>  → validates against api_keys table
 *   2. Supabase session cookie          → validates via Supabase Auth
 *
 * Sets x-user-id and x-auth-type headers on the request for downstream use.
 */
export const withAuth: Middleware = (handler) => {
  return async (req, ctx) => {
    let userId: string | null = null;
    let authType: 'api_key' | 'session' = 'session';

    // 1. Try API key
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token.startsWith('nx_')) {
        userId = await validateApiKey(token);
        authType = 'api_key';
      }
    }

    // 2. Fall back to Supabase session cookie
    if (!userId) {
      userId = await validateSession();
      authType = 'session';
    }

    if (!userId) {
      throw new UnauthorizedError('Valid API key or login session required');
    }

    // Clone request with auth context headers
    const headers = new Headers(req.headers);
    headers.set('x-user-id', userId);
    headers.set('x-auth-type', authType);
    const authedReq = new Request(req.url, {
      method: req.method,
      headers,
      body: req.body,
      // @ts-expect-error -- duplex is required for streaming bodies in Node
      duplex: 'half',
    });

    return handler(authedReq, ctx);
  };
};

/**
 * Helper to extract the authenticated user ID from a request that has
 * passed through withAuth.
 */
export function getUserId(req: Request): string {
  const id = req.headers.get('x-user-id');
  if (!id) throw new UnauthorizedError();
  return id;
}

export function getAuthType(req: Request): 'api_key' | 'session' {
  return (req.headers.get('x-auth-type') as 'api_key' | 'session') ?? 'session';
}

/**
 * Generates a new API key with a `nx_` prefix.
 * Returns the raw key (shown once) and its SHA-256 hash (stored in DB).
 */
export async function generateApiKey(): Promise<{ rawKey: string; hash: string; prefix: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const rawKey = `nx_${raw}`;
  const hash = await sha256(rawKey);
  const prefix = rawKey.slice(0, 11);
  return { rawKey, hash, prefix };
}
