import { NextResponse } from 'next/server';
import { withMiddleware, withErrorHandler } from '@/lib/server/middleware';
import { proposeTransaction } from '@/lib/server/services/transactions.service';

export const POST = withMiddleware(withErrorHandler)(async (request: Request) => {
  const body = await request.json();
  const result = await proposeTransaction(body);

  if (result.outcome === 'HOLD') {
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

  return NextResponse.json({
    status: 'APPROVE',
    message: 'Transaction approved and limits updated.',
    amount: result.amount,
    spend_today: result.spend_today,
    daily_limit: result.daily_limit,
  });
});
