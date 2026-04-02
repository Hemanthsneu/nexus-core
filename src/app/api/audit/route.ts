import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId } from '@/lib/server/auth';
import { readRateLimit } from '@/lib/server/rate-limit';
import { listAuditEntries } from '@/lib/server/services/audit.service';

export const GET = withMiddleware(withErrorHandler, withAuth, readRateLimit)(async (req: Request) => {
  const userId = getUserId(req);
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
  const offset = Number(url.searchParams.get('offset') || 0);
  const action = url.searchParams.get('action') ?? undefined;

  const entries = await listAuditEntries(userId, { limit, offset, action });

  return NextResponse.json({ entries, limit, offset });
});
