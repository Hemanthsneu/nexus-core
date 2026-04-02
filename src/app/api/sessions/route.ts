import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId, getAuthType } from '@/lib/server/auth';
import { readRateLimit, writeRateLimit } from '@/lib/server/rate-limit';
import { withUsageTracking } from '@/lib/server/usage';
import { listSessions, createSession } from '@/lib/server/services/sessions.service';
import { audit, extractIp } from '@/lib/server/services/audit.service';

export const GET = withMiddleware(withErrorHandler, withAuth, readRateLimit, withUsageTracking)(async (req: Request) => {
  const userId = getUserId(req);
  const sessions = await listSessions(userId);
  return NextResponse.json(sessions);
});

export const POST = withMiddleware(withErrorHandler, withAuth, writeRateLimit, withUsageTracking)(async (req: Request) => {
  const userId = getUserId(req);
  const body = await req.json();
  const session = await createSession(body, userId);

  void audit({
    user_id: userId,
    action: 'session.create',
    resource_type: 'session',
    resource_id: session.id,
    auth_type: getAuthType(req),
    ip_address: extractIp(req),
    metadata: { agent_name: session.agent_name, daily_limit: session.daily_limit, chains: session.allowed_chains },
  });

  return NextResponse.json(session, { status: 201 });
});
