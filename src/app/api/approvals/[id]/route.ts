import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId } from '@/lib/server/auth';
import { resolveApproval } from '@/lib/server/services/approvals.service';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withMiddleware(withErrorHandler, withAuth)(async (req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const body = await req.json();
  const result = await resolveApproval(id, body.action, userId);
  return NextResponse.json(result);
});
