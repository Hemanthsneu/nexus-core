-- Migration 010: User-configurable webhooks.
-- Each user can register URLs to receive event notifications.
-- Events are delivered with HMAC-SHA256 signatures for verification.

CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  user_id uuid NOT NULL,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['*'],
  enabled boolean NOT NULL DEFAULT true,
  description text
);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status_code integer,
  response_body text,
  attempt integer NOT NULL DEFAULT 1,
  delivered boolean NOT NULL DEFAULT false,
  error text
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user ON public.webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_del_webhook ON public.webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_del_created ON public.webhook_deliveries(created_at DESC);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhooks_select ON public.webhooks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY webhooks_insert ON public.webhooks FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY webhooks_update ON public.webhooks FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY webhooks_delete ON public.webhooks FOR DELETE USING (user_id = auth.uid());

CREATE POLICY webhook_del_select ON public.webhook_deliveries
  FOR SELECT USING (
    webhook_id IN (SELECT id FROM public.webhooks WHERE user_id = auth.uid())
  );
