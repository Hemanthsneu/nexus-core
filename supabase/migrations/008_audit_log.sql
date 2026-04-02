-- Migration 008: Immutable audit log.
-- Records every significant mutation (session CRUD, approval resolution,
-- API key management, config changes). Append-only — never updated or deleted.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  user_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  auth_type text,
  ip_address text,
  metadata jsonb DEFAULT '{}'::jsonb,
  outcome text NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'failure', 'denied'))
);

CREATE INDEX IF NOT EXISTS idx_audit_user    ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON public.audit_log(resource_type, resource_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_select ON public.audit_log
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY audit_log_insert ON public.audit_log
  FOR INSERT WITH CHECK (true);
