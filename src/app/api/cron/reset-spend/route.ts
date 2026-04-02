import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { UnauthorizedError } from '@/lib/server/errors';
import { env } from '@/lib/server/env';
import { resetDailySpend } from '@/lib/server/services/sessions.service';

export const POST = withMiddleware(withErrorHandler)(async (request: Request) => {
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
  return NextResponse.json({
    reset: count,
    timestamp: new Date().toISOString(),
  });
});
