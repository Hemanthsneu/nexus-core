import { getServerSupabase } from '@/lib/supabase/server';
import type { Middleware } from './middleware';

/**
 * API usage tracking middleware.
 * Records method, path, status, latency, and auth context for every request.
 * Writes are fire-and-forget — they never block or fail the response.
 */
export const withUsageTracking: Middleware = (handler) => {
  return async (req, ctx) => {
    const start = Date.now();
    const response = await handler(req, ctx);
    const latency = Date.now() - start;

    const url = new URL(req.url);
    const userId = req.headers.get('x-user-id') ?? null;
    const authType = req.headers.get('x-auth-type') ?? null;
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null;

    void trackUsage({
      user_id: userId,
      method: req.method,
      path: url.pathname,
      status_code: response.status,
      latency_ms: latency,
      auth_type: authType,
      ip_address: ip,
    });

    return response;
  };
};

type UsageEntry = {
  user_id: string | null;
  method: string;
  path: string;
  status_code: number;
  latency_ms: number;
  auth_type: string | null;
  ip_address: string | null;
};

async function trackUsage(entry: UsageEntry): Promise<void> {
  try {
    const db = getServerSupabase();
    await db.from('api_usage').insert(entry);
  } catch (err) {
    console.error('[usage] failed to write api_usage:', err);
  }
}

/**
 * Aggregate API usage stats for a given user within a time range.
 */
export async function getUsageStats(
  userId: string,
  opts?: { hours?: number },
) {
  const db = getServerSupabase();
  const since = new Date(Date.now() - (opts?.hours ?? 24) * 3600_000).toISOString();

  const { data, error } = await db
    .from('api_usage')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  const entries = data ?? [];

  const totalCalls = entries.length;
  const avgLatency = totalCalls > 0
    ? Math.round(entries.reduce((s, e) => s + e.latency_ms, 0) / totalCalls)
    : 0;
  const errorCount = entries.filter((e) => e.status_code >= 400).length;

  const byPath: Record<string, number> = {};
  for (const e of entries) {
    byPath[e.path] = (byPath[e.path] ?? 0) + 1;
  }

  const byStatus: Record<string, number> = {};
  for (const e of entries) {
    const bucket = `${Math.floor(e.status_code / 100)}xx`;
    byStatus[bucket] = (byStatus[bucket] ?? 0) + 1;
  }

  return {
    total_calls: totalCalls,
    avg_latency_ms: avgLatency,
    error_count: errorCount,
    error_rate: totalCalls > 0 ? +(errorCount / totalCalls * 100).toFixed(1) : 0,
    by_path: byPath,
    by_status: byStatus,
    period_hours: opts?.hours ?? 24,
  };
}
