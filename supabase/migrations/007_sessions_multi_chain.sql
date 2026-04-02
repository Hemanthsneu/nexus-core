-- Migration 007: Add multi-chain support to sessions.
-- Adds allowed_chains (text array) alongside existing allowed_chain (text).
-- Existing code continues to work with allowed_chain; new code reads allowed_chains.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS allowed_chains text[] DEFAULT ARRAY['base'];

-- Backfill: copy existing allowed_chain into the array column
UPDATE public.sessions
SET allowed_chains = ARRAY[allowed_chain]
WHERE allowed_chains IS NULL OR allowed_chains = ARRAY['base'];

-- RLS for chains config (read-only for authenticated users)
ALTER TABLE public.chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chain_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY chains_select ON public.chains FOR SELECT USING (true);
CREATE POLICY chain_tokens_select ON public.chain_tokens FOR SELECT USING (true);
