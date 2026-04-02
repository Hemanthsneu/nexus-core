import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth } from '@/lib/server/auth';
import { readRateLimit } from '@/lib/server/rate-limit';
import { withUsageTracking } from '@/lib/server/usage';
import { listEnabledChains, listChainTokens } from '@/lib/chains/registry';

export const GET = withMiddleware(withErrorHandler, withAuth, readRateLimit, withUsageTracking)(async () => {
  const chains = await listEnabledChains();

  const result = await Promise.all(
    chains.map(async (chain) => {
      const tokens = await listChainTokens(chain.id);
      return { ...chain, tokens };
    }),
  );

  return NextResponse.json(result);
});
