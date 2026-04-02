import { getServerSupabase } from '@/lib/supabase/server';
import { ValidationError, NotFoundError, ForbiddenError } from '../errors';
import { notifyApprovalRequired } from '@/lib/notify';
import { getAdapterOrThrow } from '@/lib/chains/registry';
import { deliverEvent } from './webhook.service';

export type ProposeInput = {
  session_id: string;
  amount: number;
  destination_address: string;
  chain?: string;
  token?: string;
};

export type ProposeResult =
  | { outcome: 'APPROVE'; amount: number; spend_today: number; daily_limit: number; tx_hash: string | null }
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

  // 2. Resolve chain and token (default to session's configured values)
  const chainId = input.chain || session.allowed_chain || 'base';
  const token = input.token || session.allowed_token || 'USDC';

  // 3. Validate chain is allowed for this session
  const allowedChains: string[] = session.allowed_chains || [session.allowed_chain || 'base'];
  if (!allowedChains.includes(chainId)) {
    throw new ForbiddenError(`Chain '${chainId}' not allowed. Session permits: ${allowedChains.join(', ')}`);
  }

  // 4. Validate destination address via chain adapter
  const adapter = getAdapterOrThrow(chainId);
  if (!adapter.validateAddress(destination_address)) {
    throw new ValidationError(`Invalid ${adapter.displayName} address: ${destination_address}`);
  }

  // 5. Enforce spending limits (existing logic, untouched)
  let holdReason: string | null = null;

  if (txAmount > session.per_tx_limit) {
    holdReason = `Exceeds per-transaction limit (Attempted: $${txAmount}, Limit: $${session.per_tx_limit})`;
  } else if (Number(session.spend_today) + txAmount > session.daily_limit) {
    const remaining = (session.daily_limit - Number(session.spend_today)).toFixed(2);
    holdReason = `Exceeds daily limit (Attempted: $${txAmount}, Remaining: $${remaining})`;
  }

  // 6. HOLD path
  if (holdReason) {
    const { data: approval, error: approvalError } = await db
      .from('pending_approvals')
      .insert([{ session_id, amount: txAmount, destination_address, reason: holdReason, status: 'pending' }])
      .select()
      .single();

    if (approvalError) throw new Error(approvalError.message);

    // Log the held transaction
    await logTransaction(db, {
      session_id, user_id: userId, chain_id: chainId, token,
      amount: txAmount, destination_address, outcome: 'held', approval_id: approval.id,
    });

    void notifyApprovalRequired({
      approvalId: approval.id,
      sessionId: session_id,
      agentName: session.agent_name ?? 'Unknown Agent',
      walletAddress: session.wallet_address,
      amount: txAmount,
      destinationAddress: destination_address,
      reason: holdReason,
    });

    if (userId) {
      void deliverEvent(userId, 'transaction.held', {
        approval_id: approval.id, session_id, amount: txAmount,
        destination_address, chain: chainId, token, reason: holdReason,
      });
    }

    return { outcome: 'HOLD', approval_id: approval.id, reason: holdReason };
  }

  // 7. APPROVE path — atomic spend increment + simulated transfer
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

  // Execute transfer via chain adapter (simulated in Phase 2)
  const transferResult = await adapter.transfer({
    from: session.wallet_address,
    to: destination_address,
    token,
    amount: txAmount,
  });

  // Log the approved transaction
  await logTransaction(db, {
    session_id, user_id: userId, chain_id: chainId, token,
    amount: txAmount, destination_address, outcome: 'approved',
    tx_hash: transferResult.txHash,
  });

  if (userId) {
    void deliverEvent(userId, 'transaction.approved', {
      session_id, amount: txAmount, destination_address,
      chain: chainId, token, tx_hash: transferResult.txHash,
      spend_today: newSpend, daily_limit: session.daily_limit,
    });
  }

  return {
    outcome: 'APPROVE',
    amount: txAmount,
    spend_today: newSpend,
    daily_limit: session.daily_limit,
    tx_hash: transferResult.txHash,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logTransaction(db: any, entry: {
  session_id: string;
  user_id?: string;
  chain_id: string;
  token: string;
  amount: number;
  destination_address: string;
  outcome: string;
  approval_id?: string;
  tx_hash?: string;
}) {
  await db.from('transaction_log').insert({
    session_id: entry.session_id,
    user_id: entry.user_id ?? null,
    chain_id: entry.chain_id,
    token: entry.token,
    amount: entry.amount,
    destination_address: entry.destination_address,
    outcome: entry.outcome,
    approval_id: entry.approval_id ?? null,
    tx_hash: entry.tx_hash ?? null,
  });
}
