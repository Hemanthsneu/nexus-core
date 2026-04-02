import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth } from '@/lib/server/auth';
import { listEnabledChains, listChainTokens } from '@/lib/chains/registry';

export const GET = withMiddleware(withErrorHandler, withAuth)(async () => {
  const chains = await listEnabledChains();

  const result = await Promise.all(
    chains.map(async (chain) => {
      const tokens = await listChainTokens(chain.id);
      return { ...chain, tokens };
    }),
  );

  return NextResponse.json(result);
});
