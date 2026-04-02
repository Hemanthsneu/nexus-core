-- Migration 006: Immutable transaction log.
-- Every transaction (approved or held) is recorded here.
-- This is append-only — rows are never updated or deleted.

CREATE TABLE IF NOT EXISTS public.transaction_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid,
  chain_id text NOT NULL DEFAULT 'base',
  token text NOT NULL DEFAULT 'USDC',
  amount numeric NOT NULL,
  destination_address text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('approved', 'held', 'rejected')),
  approval_id uuid REFERENCES public.pending_approvals(id),
  tx_hash text                                   -- on-chain hash, null until Phase 4
);

CREATE INDEX IF NOT EXISTS idx_tx_log_session ON public.transaction_log(session_id);
CREATE INDEX IF NOT EXISTS idx_tx_log_user    ON public.transaction_log(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_log_chain   ON public.transaction_log(chain_id);
CREATE INDEX IF NOT EXISTS idx_tx_log_created ON public.transaction_log(created_at DESC);

-- RLS for transaction log
ALTER TABLE public.transaction_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tx_log_select ON public.transaction_log
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY tx_log_insert ON public.transaction_log
  FOR INSERT WITH CHECK (user_id = auth.uid());
