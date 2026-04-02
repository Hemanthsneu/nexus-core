import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId, getAuthType } from '@/lib/server/auth';
import { writeRateLimit } from '@/lib/server/rate-limit';
import { withUsageTracking } from '@/lib/server/usage';
import { NotFoundError } from '@/lib/server/errors';
import { getServerSupabase } from '@/lib/supabase/server';
import { audit, extractIp } from '@/lib/server/services/audit.service';

type RouteContext = { params: Promise<{ id: string }> };

export const DELETE = withMiddleware(withErrorHandler, withAuth, writeRateLimit, withUsageTracking)(async (req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const userId = getUserId(req);

  const db = getServerSupabase();
  const { data, error } = await db
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single();

  if (error || !data) throw new NotFoundError('API Key', id);

  void audit({
    user_id: userId,
    action: 'api_key.revoke',
    resource_type: 'api_key',
    resource_id: id,
    auth_type: getAuthType(req),
    ip_address: extractIp(req),
  });

  return NextResponse.json({ id, revoked: true });
});
