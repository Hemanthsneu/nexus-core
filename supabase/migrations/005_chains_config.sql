-- Migration 005: Supported chains configuration table.
-- Each row defines a chain+token pair the platform supports.
-- New chains are added by inserting rows, never by altering schema.

CREATE TABLE IF NOT EXISTS public.chains (
  id text PRIMARY KEY,                           -- e.g. 'base', 'ethereum', 'polygon'
  display_name text NOT NULL,
  native_token text NOT NULL,                    -- e.g. 'ETH'
  rpc_url text,
  explorer_url text,
  is_testnet boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chain_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id text NOT NULL REFERENCES public.chains(id) ON DELETE CASCADE,
  symbol text NOT NULL,                          -- e.g. 'USDC', 'USDT'
  contract_address text,                         -- null for native token
  decimals integer NOT NULL DEFAULT 6,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE (chain_id, symbol)
);

-- Seed: Base + USDC (matches current hardcoded values)
INSERT INTO public.chains (id, display_name, native_token, explorer_url)
VALUES ('base', 'Base', 'ETH', 'https://basescan.org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.chain_tokens (chain_id, symbol, contract_address, decimals)
VALUES ('base', 'USDC', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 6)
ON CONFLICT (chain_id, symbol) DO NOTHING;

-- Seed additional chains (disabled by default — enable when ready)
INSERT INTO public.chains (id, display_name, native_token, explorer_url, enabled)
VALUES
  ('ethereum', 'Ethereum', 'ETH', 'https://etherscan.io', false),
  ('polygon', 'Polygon', 'MATIC', 'https://polygonscan.com', false),
  ('arbitrum', 'Arbitrum', 'ETH', 'https://arbiscan.io', false)
ON CONFLICT (id) DO NOTHING;
