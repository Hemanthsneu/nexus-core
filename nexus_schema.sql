-- NEXUS PROTOCOL MVP SCHEMA v2
-- Focus: AI Agent Session Management and Spending Controls
-- Run this in your Supabase SQL editor.

-- 1. Sessions table — one row per agent
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,

  -- Optional user reference (link to Supabase auth.users later)
  user_id uuid,

  -- Human-readable name shown in the dashboard
  agent_name text NOT NULL DEFAULT 'Unnamed Agent',

  -- Wallet generated per session (Coinbase CDP in production, simulated in v1)
  wallet_address text NOT NULL,

  -- Spending controls
  daily_limit numeric NOT NULL DEFAULT 50.00,
  per_tx_limit numeric NOT NULL DEFAULT 10.00,
  spend_today numeric NOT NULL DEFAULT 0.00,

  -- Scope: currently Base + USDC only
  allowed_chain text NOT NULL DEFAULT 'base',
  allowed_token text NOT NULL DEFAULT 'USDC',

  -- Session lifecycle
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'revoked'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);

-- 2. Pending approvals — the human-in-the-loop queue
CREATE TABLE IF NOT EXISTS public.pending_approvals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,

  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE,

  -- Transaction details
  amount numeric NOT NULL,
  destination_address text NOT NULL,
  reason text NOT NULL,

  -- Queue state
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_approvals_session ON public.pending_approvals(session_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status  ON public.pending_approvals(status);

-- 3. Realtime — enable for live dashboard updates
-- Run in Supabase dashboard → Database → Replication → enable for both tables, or:
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_approvals;
