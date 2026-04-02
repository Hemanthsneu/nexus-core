import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { getSession, updateSession } from '@/lib/server/services/sessions.service';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = withMiddleware(withErrorHandler)(async (_request: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const session = await getSession(id);
  return NextResponse.json(session);
});

export const PATCH = withMiddleware(withErrorHandler)(async (request: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const body = await request.json();
  const session = await updateSession(id, body);
  return NextResponse.json(session);
});
