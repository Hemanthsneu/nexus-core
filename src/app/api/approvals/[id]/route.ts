import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { resolveApproval } from '@/lib/server/services/approvals.service';

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withMiddleware(withErrorHandler)(async (request: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const body = await request.json();
  const result = await resolveApproval(id, body.action);
  return NextResponse.json(result);
});
