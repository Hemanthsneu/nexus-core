-- Migration 002: Atomic spend increment function.
-- Prevents the read-modify-write race condition on spend_today.
-- Used by transactions.service.ts via supabase.rpc('increment_spend', ...).

CREATE OR REPLACE FUNCTION public.increment_spend(
  p_session_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.sessions
  SET spend_today = spend_today + p_amount
  WHERE id = p_session_id;
END;
$$;
