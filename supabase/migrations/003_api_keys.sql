-- Migration 003: API key table for programmatic authentication.
-- Keys are SHA-256 hashed; the raw key is shown once at creation time.

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Default Key',
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT api_keys_hash_unique UNIQUE (key_hash)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
