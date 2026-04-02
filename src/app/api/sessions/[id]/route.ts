import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId, getAuthType } from '@/lib/server/auth';
import { readRateLimit, writeRateLimit } from '@/lib/server/rate-limit';
import { withUsageTracking } from '@/lib/server/usage';
import { getSession, updateSession } from '@/lib/server/services/sessions.service';
import { audit, extractIp } from '@/lib/server/services/audit.service';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withMiddleware(withErrorHandler, withAuth, readRateLimit, withUsageTracking)(async (req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const session = await getSession(id, userId);
  return NextResponse.json(session);
});

export const PATCH = withMiddleware(withErrorHandler, withAuth, writeRateLimit, withUsageTracking)(async (req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const body = await req.json();
  const session = await updateSession(id, body, userId);

  const action = body.status === 'paused' ? 'session.pause'
    : body.status === 'revoked' ? 'session.revoke'
    : body.status === 'active' ? 'session.resume'
    : 'session.update';

  void audit({
    user_id: userId,
    action: action as 'session.update',
    resource_type: 'session',
    resource_id: id,
    auth_type: getAuthType(req),
    ip_address: extractIp(req),
    metadata: body,
  });

  return NextResponse.json(session);
});
