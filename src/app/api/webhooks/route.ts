import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId, getAuthType } from '@/lib/server/auth';
import { readRateLimit, writeRateLimit } from '@/lib/server/rate-limit';
import { withUsageTracking } from '@/lib/server/usage';
import { listWebhooks, createWebhook } from '@/lib/server/services/webhook.service';
import { audit, extractIp } from '@/lib/server/services/audit.service';

export const GET = withMiddleware(withErrorHandler, withAuth, readRateLimit, withUsageTracking)(async (req: Request) => {
  const userId = getUserId(req);
  const webhooks = await listWebhooks(userId);
  return NextResponse.json(webhooks);
});

export const POST = withMiddleware(withErrorHandler, withAuth, writeRateLimit, withUsageTracking)(async (req: Request) => {
  const userId = getUserId(req);
  const body = await req.json();
  const webhook = await createWebhook(body, userId);

  void audit({
    user_id: userId,
    action: 'api_key.create',
    resource_type: 'webhook',
    resource_id: webhook.id,
    auth_type: getAuthType(req),
    ip_address: extractIp(req),
    metadata: { url: webhook.url, events: webhook.events },
  });

  return NextResponse.json(webhook, { status: 201 });
});
