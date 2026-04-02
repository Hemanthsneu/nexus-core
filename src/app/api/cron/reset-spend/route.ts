import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withUsageTracking } from '@/lib/server/usage';
import { UnauthorizedError } from '@/lib/server/errors';
import { env } from '@/lib/server/env';
import { resetDailySpend } from '@/lib/server/services/sessions.service';
import { audit } from '@/lib/server/services/audit.service';

export const POST = withMiddleware(withErrorHandler, withUsageTracking)(async (request: Request) => {
  const cronSecret = env.cron.secret;
  if (cronSecret) {
    const provided =
      request.headers.get('x-cron-secret') ??
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!provided || provided !== cronSecret) {
      throw new UnauthorizedError();
    }
  }

  const count = await resetDailySpend();

  void audit({
    action: 'cron.reset_spend',
    resource_type: 'system',
    metadata: { sessions_reset: count },
  });

  return NextResponse.json({
    reset: count,
    timestamp: new Date().toISOString(),
  });
});
