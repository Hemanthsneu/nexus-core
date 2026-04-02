import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId } from '@/lib/server/auth';
import { writeRateLimit } from '@/lib/server/rate-limit';
import { withUsageTracking } from '@/lib/server/usage';
import { deleteWebhook, toggleWebhook } from '@/lib/server/services/webhook.service';

type RouteContext = { params: Promise<{ id: string }> };

export const DELETE = withMiddleware(withErrorHandler, withAuth, writeRateLimit, withUsageTracking)(async (req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  await deleteWebhook(id, userId);
  return NextResponse.json({ id, deleted: true });
});

export const PATCH = withMiddleware(withErrorHandler, withAuth, writeRateLimit, withUsageTracking)(async (req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const userId = getUserId(req);
  const body = await req.json();
  const webhook = await toggleWebhook(id, body.enabled ?? true, userId);
  return NextResponse.json(webhook);
});
