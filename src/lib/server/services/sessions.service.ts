import { getServerSupabase } from '@/lib/supabase/server';
import { NotFoundError, ValidationError } from '../errors';
import { getAdapterOrThrow } from '@/lib/chains/registry';

const ALLOWED_STATUSES = ['active', 'paused', 'revoked'] as const;
type SessionStatus = (typeof ALLOWED_STATUSES)[number];

export type CreateSessionInput = {
  agent_name?: string;
  daily_limit?: number;
  per_tx_limit?: number;
  allowed_chain?: string;
  allowed_chains?: string[];
  allowed_token?: string;
};

export async function createSession(input: CreateSessionInput, userId?: string) {
  const primaryChain = input.allowed_chain || 'base';
  const chains = input.allowed_chains || [primaryChain];

  // Generate wallet via chain adapter
  const adapter = getAdapterOrThrow(primaryChain);
  const wallet = await adapter.generateWallet();

  const db = getServerSupabase();
  const { data, error } = await db
    .from('sessions')
    .insert([
      {
        agent_name: input.agent_name || `Agent-${Date.now()}`,
        wallet_address: wallet.address,
        daily_limit: Number(input.daily_limit) || 50.0,
        per_tx_limit: Number(input.per_tx_limit) || 10.0,
        allowed_chain: primaryChain,
        allowed_chains: chains,
        allowed_token: input.allowed_token || 'USDC',
        status: 'active',
        ...(userId ? { user_id: userId } : {}),
      },
    ])
    .select()
    .single();

  if (error) throw new ValidationError(error.message);
  return data;
}

export async function listSessions(userId?: string) {
  const db = getServerSupabase();
  let query = db
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getSession(id: string, userId?: string) {
  const db = getServerSupabase();
  let query = db.from('sessions').select('*').eq('id', id);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query.single();
  if (error || !data) throw new NotFoundError('Session', id);
  return data;
}

export type UpdateSessionInput = {
  status?: string;
  daily_limit?: number;
  per_tx_limit?: number;
  agent_name?: string;
  allowed_chains?: string[];
};

export async function updateSession(id: string, input: UpdateSessionInput, userId?: string) {
  const patch: Record<string, unknown> = {};

  if (input.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(input.status as SessionStatus)) {
      throw new ValidationError(`Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`);
    }
    patch.status = input.status;
  }

  if (input.daily_limit !== undefined) {
    const val = Number(input.daily_limit);
    if (isNaN(val) || val <= 0) throw new ValidationError('daily_limit must be a positive number');
    patch.daily_limit = val;
  }

  if (input.per_tx_limit !== undefined) {
    const val = Number(input.per_tx_limit);
    if (isNaN(val) || val <= 0) throw new ValidationError('per_tx_limit must be a positive number');
    patch.per_tx_limit = val;
  }

  if (input.agent_name !== undefined) {
    const name = String(input.agent_name).trim();
    if (!name) throw new ValidationError('agent_name cannot be empty');
    patch.agent_name = name;
  }

  if (input.allowed_chains !== undefined) {
    if (!Array.isArray(input.allowed_chains) || input.allowed_chains.length === 0) {
      throw new ValidationError('allowed_chains must be a non-empty array');
    }
    patch.allowed_chains = input.allowed_chains;
    patch.allowed_chain = input.allowed_chains[0];
  }

  if (Object.keys(patch).length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  const db = getServerSupabase();
  let query = db.from('sessions').update(patch).eq('id', id);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query.select().single();
  if (error || !data) throw new NotFoundError('Session', id);
  return data;
}

export async function resetDailySpend() {
  const db = getServerSupabase();
  const { data, error } = await db
    .from('sessions')
    .update({ spend_today: 0 })
    .in('status', ['active', 'paused'])
    .select('id');

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}
