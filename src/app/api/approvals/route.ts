import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId } from '@/lib/server/auth';
import { readRateLimit } from '@/lib/server/rate-limit';
import { withUsageTracking } from '@/lib/server/usage';
import { listApprovals } from '@/lib/server/services/approvals.service';

export const GET = withMiddleware(withErrorHandler, withAuth, readRateLimit, withUsageTracking)(async (req: Request) => {
  const userId = getUserId(req);
  const { searchParams } = new URL(req.url);
  const data = await listApprovals({
    status: searchParams.get('status') ?? undefined,
    sessionId: searchParams.get('session_id') ?? undefined,
    userId,
  });
  return NextResponse.json(data);
});
