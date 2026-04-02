import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId } from '@/lib/server/auth';
import { readRateLimit } from '@/lib/server/rate-limit';
import { withUsageTracking } from '@/lib/server/usage';
import { getServerSupabase } from '@/lib/supabase/server';

export const GET = withMiddleware(withErrorHandler, withAuth, readRateLimit, withUsageTracking)(async (req: Request) => {
  const userId = getUserId(req);
  const url = new URL(req.url);

  const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
  const offset = Number(url.searchParams.get('offset') || 0);
  const chain = url.searchParams.get('chain');
  const outcome = url.searchParams.get('outcome');
  const sessionId = url.searchParams.get('session_id');

  const db = getServerSupabase();
  let query = db
    .from('transaction_log')
    .select('*, sessions(agent_name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (chain) query = query.eq('chain_id', chain);
  if (outcome) query = query.eq('outcome', outcome);
  if (sessionId) query = query.eq('session_id', sessionId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const countQuery = db
    .from('transaction_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count } = await countQuery;

  return NextResponse.json({
    transactions: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
});
