import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { listApprovals } from '@/lib/server/services/approvals.service';

export const GET = withMiddleware(withErrorHandler)(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const data = await listApprovals({
    status: searchParams.get('status') ?? undefined,
    sessionId: searchParams.get('session_id') ?? undefined,
  });
  return NextResponse.json(data);
});
