-- NEXUS PROTOCOL SCHEMA v1
-- Migration 001: Initial tables for agent sessions and approval workflow.
-- This migration is the exact schema from the MVP — preserved as-is.

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,

  user_id uuid,

  agent_name text NOT NULL DEFAULT 'Unnamed Agent',
  wallet_address text NOT NULL,

  daily_limit numeric NOT NULL DEFAULT 50.00,
  per_tx_limit numeric NOT NULL DEFAULT 10.00,
  spend_today numeric NOT NULL DEFAULT 0.00,

  allowed_chain text NOT NULL DEFAULT 'base',
  allowed_token text NOT NULL DEFAULT 'USDC',

  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'revoked'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);

CREATE TABLE IF NOT EXISTS public.pending_approvals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,

  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,

  amount numeric NOT NULL,
  destination_address text NOT NULL,
  reason text NOT NULL,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_approvals_session ON public.pending_approvals(session_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status  ON public.pending_approvals(status);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_approvals;
