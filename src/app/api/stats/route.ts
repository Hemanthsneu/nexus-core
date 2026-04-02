import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId } from '@/lib/server/auth';
import { readRateLimit } from '@/lib/server/rate-limit';
import { getUsageStats } from '@/lib/server/usage';
import { getServerSupabase } from '@/lib/supabase/server';

export const GET = withMiddleware(withErrorHandler, withAuth, readRateLimit)(async (req: Request) => {
  const userId = getUserId(req);
  const url = new URL(req.url);
  const hours = Math.min(Number(url.searchParams.get('hours') || 24), 168);

  const db = getServerSupabase();
  const since = new Date(Date.now() - hours * 3600_000).toISOString();

  const [usage, txLogs, sessions] = await Promise.all([
    getUsageStats(userId, { hours }),
    db
      .from('transaction_log')
      .select('outcome, amount, chain_id, token')
      .eq('user_id', userId)
      .gte('created_at', since),
    db
      .from('sessions')
      .select('id, status, spend_today, daily_limit')
      .eq('user_id', userId),
  ]);

  const txEntries = txLogs.data ?? [];
  const txByOutcome: Record<string, number> = {};
  let totalVolume = 0;
  for (const tx of txEntries) {
    txByOutcome[tx.outcome] = (txByOutcome[tx.outcome] ?? 0) + 1;
    totalVolume += Number(tx.amount);
  }

  const sessionData = sessions.data ?? [];
  const activeCount = sessionData.filter((s) => s.status === 'active').length;
  const totalSpend = sessionData.reduce((s, d) => s + Number(d.spend_today), 0);

  return NextResponse.json({
    period_hours: hours,
    api: usage,
    transactions: {
      total: txEntries.length,
      volume_usd: +totalVolume.toFixed(2),
      by_outcome: txByOutcome,
    },
    sessions: {
      total: sessionData.length,
      active: activeCount,
      total_spend_today: +totalSpend.toFixed(2),
    },
  });
});
