import { getServerSupabase } from '@/lib/supabase/server';
import { NotFoundError, ValidationError, ConflictError } from '../errors';

export type ListApprovalsOptions = {
  status?: string;
  sessionId?: string;
};

export async function listApprovals(options: ListApprovalsOptions = {}) {
  const db = getServerSupabase();
  let query = db
    .from('pending_approvals')
    .select('*, sessions(agent_name, wallet_address, daily_limit, per_tx_limit)')
    .order('created_at', { ascending: false });

  const status = options.status ?? 'pending';
  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (options.sessionId) {
    query = query.eq('session_id', options.sessionId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function resolveApproval(id: string, action: 'approve' | 'reject') {
  if (action !== 'approve' && action !== 'reject') {
    throw new ValidationError('action must be "approve" or "reject"');
  }

  const db = getServerSupabase();

  const { data: approval, error: fetchError } = await db
    .from('pending_approvals')
    .select('*, sessions(*)')
    .eq('id', id)
    .single();

  if (fetchError || !approval) throw new NotFoundError('Approval', id);

  if (approval.status !== 'pending') {
    throw new ConflictError(`Approval already resolved with status: ${approval.status}`);
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const resolvedAt = new Date().toISOString();

  const { error: updateError } = await db
    .from('pending_approvals')
    .update({ status: newStatus, resolved_at: resolvedAt })
    .eq('id', id);

  if (updateError) throw new Error(updateError.message);

  if (action === 'approve' && approval.sessions) {
    const session = approval.sessions as Record<string, unknown>;
    const newSpend = Number(session.spend_today ?? 0) + Number(approval.amount);
    const { error: spendError } = await db
      .from('sessions')
      .update({ spend_today: newSpend })
      .eq('id', approval.session_id);

    if (spendError) throw new Error(spendError.message);
  }

  return { id, status: newStatus, resolved_at: resolvedAt };
}
