import { getServerSupabase } from '@/lib/supabase/server';
import { NotFoundError, ValidationError } from '../errors';

const ALLOWED_STATUSES = ['active', 'paused', 'revoked'] as const;
type SessionStatus = (typeof ALLOWED_STATUSES)[number];

function generateWalletAddress(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export type CreateSessionInput = {
  agent_name?: string;
  daily_limit?: number;
  per_tx_limit?: number;
  allowed_chain?: string;
  allowed_token?: string;
};

export async function createSession(input: CreateSessionInput) {
  const db = getServerSupabase();
  const { data, error } = await db
    .from('sessions')
    .insert([
      {
        agent_name: input.agent_name || `Agent-${Date.now()}`,
        wallet_address: generateWalletAddress(),
        daily_limit: Number(input.daily_limit) || 50.0,
        per_tx_limit: Number(input.per_tx_limit) || 10.0,
        allowed_chain: input.allowed_chain || 'base',
        allowed_token: input.allowed_token || 'USDC',
        status: 'active',
      },
    ])
    .select()
    .single();

  if (error) throw new ValidationError(error.message);
  return data;
}

export async function listSessions() {
  const db = getServerSupabase();
  const { data, error } = await db
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getSession(id: string) {
  const db = getServerSupabase();
  const { data, error } = await db
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new NotFoundError('Session', id);
  return data;
}

export type UpdateSessionInput = {
  status?: string;
  daily_limit?: number;
  per_tx_limit?: number;
  agent_name?: string;
};

export async function updateSession(id: string, input: UpdateSessionInput) {
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

  if (Object.keys(patch).length === 0) {
    throw new ValidationError('No valid fields to update');
  }

  const db = getServerSupabase();
  const { data, error } = await db
    .from('sessions')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

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
