-- Migration 004: Row Level Security policies.
-- The server-side service role client bypasses all RLS automatically.
-- These policies scope the browser anon client (dashboard reads) by auth.uid().

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Sessions: authenticated users see only their own rows
CREATE POLICY sessions_select ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY sessions_insert ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY sessions_update ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Pending approvals: visible if the parent session belongs to the user
CREATE POLICY approvals_select ON public.pending_approvals
  FOR SELECT USING (
    session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())
  );
CREATE POLICY approvals_insert ON public.pending_approvals
  FOR INSERT WITH CHECK (
    session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())
  );
CREATE POLICY approvals_update ON public.pending_approvals
  FOR UPDATE USING (
    session_id IN (SELECT id FROM public.sessions WHERE user_id = auth.uid())
  );

-- API keys: users manage only their own keys
CREATE POLICY api_keys_select ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY api_keys_insert ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY api_keys_update ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);
