import type { ChainAdapter, ChainConfig, TokenConfig } from './types';
import { BaseAdapter } from './base';
import { getServerSupabase } from '@/lib/supabase/server';

/**
 * Chain adapter registry.
 * Resolves a chain ID to its adapter. New adapters are registered here
 * once — all service code uses getAdapter(chainId) to stay chain-agnostic.
 */
const adapters: Record<string, ChainAdapter> = {
  base: new BaseAdapter(),
};

export function getAdapter(chainId: string): ChainAdapter | undefined {
  return adapters[chainId];
}

export function getAdapterOrThrow(chainId: string): ChainAdapter {
  const adapter = adapters[chainId];
  if (!adapter) {
    throw new Error(`No adapter registered for chain: ${chainId}`);
  }
  return adapter;
}

export function listAdapterIds(): string[] {
  return Object.keys(adapters);
}

/** Fetch enabled chains from the database. */
export async function listEnabledChains(): Promise<ChainConfig[]> {
  const db = getServerSupabase();
  const { data, error } = await db
    .from('chains')
    .select('*')
    .eq('enabled', true)
    .order('id');

  if (error) throw new Error(error.message);
  return (data ?? []) as ChainConfig[];
}

/** Fetch enabled tokens for a given chain. */
export async function listChainTokens(chainId: string): Promise<TokenConfig[]> {
  const db = getServerSupabase();
  const { data, error } = await db
    .from('chain_tokens')
    .select('*')
    .eq('chain_id', chainId)
    .eq('enabled', true);

  if (error) throw new Error(error.message);
  return (data ?? []) as TokenConfig[];
}
