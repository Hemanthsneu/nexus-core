import { getServerSupabase } from '@/lib/supabase/server';

export type AuditAction =
  | 'session.create'
  | 'session.update'
  | 'session.pause'
  | 'session.revoke'
  | 'session.resume'
  | 'transaction.approve'
  | 'transaction.hold'
  | 'approval.approve'
  | 'approval.reject'
  | 'api_key.create'
  | 'api_key.revoke'
  | 'cron.reset_spend';

export type AuditEntry = {
  user_id?: string | null;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  auth_type?: string;
  ip_address?: string;
  metadata?: Record<string, unknown>;
  outcome?: 'success' | 'failure' | 'denied';
};

/**
 * Append an entry to the immutable audit log.
 * Fire-and-forget by default — caller doesn't need to await.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const db = getServerSupabase();
    await db.from('audit_log').insert({
      user_id: entry.user_id ?? null,
      action: entry.action,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id ?? null,
      auth_type: entry.auth_type ?? null,
      ip_address: entry.ip_address ?? null,
      metadata: entry.metadata ?? {},
      outcome: entry.outcome ?? 'success',
    });
  } catch (err) {
    console.error('[audit] failed to write audit log:', err);
  }
}

/**
 * Helper to extract client IP from a request.
 */
export function extractIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * Query audit log entries for a given user.
 */
export async function listAuditEntries(
  userId: string,
  opts?: { limit?: number; offset?: number; action?: string },
) {
  const db = getServerSupabase();
  let query = db
    .from('audit_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (opts?.action) query = query.eq('action', opts.action);
  if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
  else if (opts?.limit) query = query.limit(opts.limit);
  else query = query.limit(50);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
