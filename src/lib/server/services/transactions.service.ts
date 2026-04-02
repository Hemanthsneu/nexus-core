import { getServerSupabase } from '@/lib/supabase/server';
import { ValidationError, NotFoundError, ForbiddenError } from '../errors';
import { notifyApprovalRequired } from '@/lib/notify';

export type ProposeInput = {
  session_id: string;
  amount: number;
  destination_address: string;
};

export type ProposeResult =
  | { outcome: 'APPROVE'; amount: number; spend_today: number; daily_limit: number }
  | { outcome: 'HOLD'; approval_id: string; reason: string };

export async function proposeTransaction(input: ProposeInput, userId?: string): Promise<ProposeResult> {
  const { session_id, amount, destination_address } = input;

  if (!session_id || amount === undefined || !destination_address) {
    throw new ValidationError('Missing required fields: session_id, amount, destination_address');
  }

  const txAmount = Number(amount);
  if (isNaN(txAmount) || txAmount <= 0) {
    throw new ValidationError('amount must be a positive number');
  }

  const db = getServerSupabase();

  // 1. Fetch the session (scoped to user if authenticated)
  let query = db.from('sessions').select('*').eq('id', session_id);
  if (userId) query = query.eq('user_id', userId);

  const { data: session, error: sessionError } = await query.single();
  if (sessionError || !session) throw new NotFoundError('Session', session_id);

  if (session.status !== 'active') {
    throw new ForbiddenError(`Session is ${session.status}`);
  }

  if (session.allowed_token !== 'USDC' || session.allowed_chain !== 'base') {
    throw new ForbiddenError(
      `Session only allows ${session.allowed_token} on ${session.allowed_chain}`,
    );
  }

  // 2. Enforce spending limits
  let holdReason: string | null = null;

  if (txAmount > session.per_tx_limit) {
    holdReason = `Exceeds per-transaction limit (Attempted: $${txAmount}, Limit: $${session.per_tx_limit})`;
  } else if (Number(session.spend_today) + txAmount > session.daily_limit) {
    const remaining = (session.daily_limit - Number(session.spend_today)).toFixed(2);
    holdReason = `Exceeds daily limit (Attempted: $${txAmount}, Remaining: $${remaining})`;
  }

  // 3. HOLD path
  if (holdReason) {
    const { data: approval, error: approvalError } = await db
      .from('pending_approvals')
      .insert([{ session_id, amount: txAmount, destination_address, reason: holdReason, status: 'pending' }])
      .select()
      .single();

    if (approvalError) throw new Error(approvalError.message);

    void notifyApprovalRequired({
      approvalId: approval.id,
      sessionId: session_id,
      agentName: session.agent_name ?? 'Unknown Agent',
      walletAddress: session.wallet_address,
      amount: txAmount,
      destinationAddress: destination_address,
      reason: holdReason,
    });

    return { outcome: 'HOLD', approval_id: approval.id, reason: holdReason };
  }

  // 4. APPROVE path — atomic spend increment
  const newSpend = Number(session.spend_today) + txAmount;
  const { error: rpcError } = await db.rpc('increment_spend', {
    p_session_id: session.id,
    p_amount: txAmount,
  });

  if (rpcError) {
    const { error: updateError } = await db
      .from('sessions')
      .update({ spend_today: newSpend })
      .eq('id', session.id);
    if (updateError) throw new Error(updateError.message);
  }

  return {
    outcome: 'APPROVE',
    amount: txAmount,
    spend_today: newSpend,
    daily_limit: session.daily_limit,
  };
}
