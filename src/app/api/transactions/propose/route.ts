import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { withAuth, getUserId, getAuthType } from '@/lib/server/auth';
import { writeRateLimit } from '@/lib/server/rate-limit';
import { withUsageTracking } from '@/lib/server/usage';
import { proposeTransaction } from '@/lib/server/services/transactions.service';
import { audit, extractIp } from '@/lib/server/services/audit.service';

export const POST = withMiddleware(withErrorHandler, withAuth, writeRateLimit, withUsageTracking)(async (req: Request) => {
  const userId = getUserId(req);
  const body = await req.json();
  const result = await proposeTransaction(body, userId);

  if (result.outcome === 'HOLD') {
    void audit({
      user_id: userId,
      action: 'transaction.hold',
      resource_type: 'transaction',
      resource_id: result.approval_id,
      auth_type: getAuthType(req),
      ip_address: extractIp(req),
      metadata: { session_id: body.session_id, amount: body.amount, chain: body.chain, reason: result.reason },
    });

    return NextResponse.json(
      {
        status: 'HOLD',
        message: 'Transaction held for human approval.',
        approval_id: result.approval_id,
        reason: result.reason,
      },
      { status: 202 },
    );
  }

  void audit({
    user_id: userId,
    action: 'transaction.approve',
    resource_type: 'transaction',
    resource_id: result.tx_hash ?? undefined,
    auth_type: getAuthType(req),
    ip_address: extractIp(req),
    metadata: { session_id: body.session_id, amount: result.amount, chain: body.chain, tx_hash: result.tx_hash },
  });

  return NextResponse.json({
    status: 'APPROVE',
    message: 'Transaction approved and limits updated.',
    amount: result.amount,
    spend_today: result.spend_today,
    daily_limit: result.daily_limit,
    tx_hash: result.tx_hash,
    chain: body.chain || 'base',
    token: body.token || 'USDC',
  });
});
