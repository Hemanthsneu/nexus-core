import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId } from '@/lib/server/auth';
import { getSession, updateSession } from '@/lib/server/services/sessions.service';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withMiddleware(withErrorHandler, withAuth)(async (req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const session = await getSession(id, userId);
  return NextResponse.json(session);
});

export const PATCH = withMiddleware(withErrorHandler, withAuth)(async (req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const body = await req.json();
  const session = await updateSession(id, body, userId);
  return NextResponse.json(session);
});
