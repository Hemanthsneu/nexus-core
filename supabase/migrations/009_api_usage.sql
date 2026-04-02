-- Migration 009: API usage metrics.
-- Tracks every API call with method, path, status, latency.
-- Powers the observability dashboard and usage-based billing (Phase 5+).

CREATE TABLE IF NOT EXISTS public.api_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  user_id uuid,
  method text NOT NULL,
  path text NOT NULL,
  status_code integer NOT NULL,
  latency_ms integer NOT NULL,
  auth_type text,
  ip_address text
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user    ON public.api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON public.api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_path    ON public.api_usage(path);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_usage_select ON public.api_usage
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY api_usage_insert ON public.api_usage
  FOR INSERT WITH CHECK (true);
