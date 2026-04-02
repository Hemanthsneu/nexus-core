# Nexus Core

Control plane for autonomous AI agent payments. Sessions with spending limits, multi-chain wallets, human-in-the-loop approval workflows, webhook notifications, full observability, and a real-time operator dashboard.

## Architecture

```
src/
  app/
    page.tsx                        Dashboard (tabbed: Overview | Transactions | Activity)
    login/page.tsx                  Auth: signup + sign-in
    settings/page.tsx               API Keys + Webhooks management
    api/
      sessions/         route.ts    GET list, POST create
      sessions/[id]/    route.ts    GET single, PATCH update status/limits/chains
      approvals/        route.ts    GET list (filter by status/session)
      approvals/[id]/   route.ts    PATCH approve/reject
      transactions/
        propose/        route.ts    POST — policy engine: chain validate → limit check → transfer
        history/        route.ts    GET — paginated transaction log with filters
      chains/           route.ts    GET — enabled chains + tokens
      webhooks/         route.ts    GET list, POST create
      webhooks/[id]/    route.ts    PATCH toggle, DELETE
      stats/            route.ts    GET — observability metrics
      audit/            route.ts    GET — audit trail entries
      auth/api-keys/    route.ts    GET list, POST create API key
      auth/api-keys/[id]/ route.ts  DELETE revoke API key
      cron/reset-spend/ route.ts    POST — daily spend counter reset
  sdk/
    index.ts                        NexusClient SDK — typed API wrapper for agents
  lib/
    server/
      middleware.ts                 Composable: withMiddleware(withErrorHandler, withAuth, ...)
      auth.ts                       API key + session cookie authentication
      rate-limit.ts                 Sliding window per-user rate limiting
      usage.ts                      API usage tracking middleware
      errors.ts                     Typed error hierarchy
      env.ts                        Validated environment config
      services/
        sessions.service.ts         Session CRUD + chain-aware wallet generation
        approvals.service.ts        Approval resolution with spend update
        transactions.service.ts     Policy engine: chain/address validation, limits, tx logging
        audit.service.ts            Immutable audit log
        webhook.service.ts          Webhook CRUD, HMAC-signed delivery with retries
    chains/
      types.ts                      ChainAdapter interface
      base.ts                       Base chain adapter (simulated transfers)
      registry.ts                   Chain adapter registry + DB config
    supabase/
      client.ts                     Browser-safe anon client
      server.ts                     Server-only service role client
      middleware.ts                 Edge middleware Supabase client
    notify.ts                       Microsoft Teams Adaptive Cards
    utils.ts                        Tailwind cn() helper
  components/                       UI: Navbar, HUDOverlay, ThemeToggle, shadcn

supabase/
  migrations/
    001_initial_schema.sql          Sessions + pending_approvals
    002_atomic_spend.sql            Race-safe spend increment function
    003_api_keys.sql                API key storage (SHA-256 hashed)
    004_rls_policies.sql            Row Level Security policies
    005_chains_config.sql           Chains + chain_tokens config
    006_transaction_log.sql         Immutable transaction ledger
    007_sessions_multi_chain.sql    allowed_chains array on sessions
    008_audit_log.sql               Immutable audit trail
    009_api_usage.sql               API usage metrics
    010_webhooks.sql                Webhooks + delivery log
```

## Middleware Stack

Every API route composes middleware right-to-left. New capabilities slot in without touching handlers:

```typescript
export const POST = withMiddleware(
  withErrorHandler,     // Phase 0: structured error responses
  withAuth,             // Phase 1: API key + session authentication
  writeRateLimit,       // Phase 3: 30 req/min sliding window
  withUsageTracking,    // Phase 3: method, path, status, latency logging
)(async (req) => {
  const userId = getUserId(req);
  const body = await req.json();
  const result = await proposeTransaction(body, userId);
  return NextResponse.json(result);
});
```

## SDK

The `NexusClient` SDK provides typed access to all API endpoints:

```typescript
import { NexusClient } from '@/sdk';

const nexus = new NexusClient({
  apiKey: 'nx_your_key_here',
  baseUrl: 'http://localhost:3001',
});

// Create an agent session
const session = await nexus.sessions.create({
  agent_name: 'My Agent',
  daily_limit: 100,
  per_tx_limit: 20,
  allowed_chains: ['base'],
});

// Propose a transaction
const result = await nexus.transactions.propose({
  session_id: session.id,
  amount: 15,
  destination_address: '0x...',
  chain: 'base',
  token: 'USDC',
});

if (result.status === 'APPROVE') {
  console.log('TX Hash:', result.tx_hash);
} else {
  console.log('Held for review:', result.reason);
}

// View transaction history
const history = await nexus.transactions.history({ session_id: session.id });

// Check observability
const stats = await nexus.stats.get(24);

// Manage webhooks
await nexus.webhooks.create({
  url: 'https://your-app.com/webhooks',
  events: ['transaction.approved', 'transaction.held'],
});
```

## Quick Start

```bash
# Install
npm install

# Set up Supabase (creates project, applies migrations, writes .env.local)
npm run setup

# Or manually: copy .env.example → .env.local and fill in values

# Start dev server
npm run dev        # http://localhost:3001

# Test the complete agent flow
API_KEY=nx_your_key node test-agent.mjs
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Service role key (bypasses RLS) |
| `TEAMS_WEBHOOK_URL` | Optional | Teams incoming webhook for approval alerts |
| `CRON_SECRET` | Optional | Secures the daily spend reset endpoint |
| `NEXT_PUBLIC_APP_URL` | Optional | Dashboard URL for Teams card links |

## API

All endpoints require authentication (API key or session cookie) unless noted. Rate limit headers included on every response.

| Method | Endpoint | Rate | Description |
|--------|----------|------|-------------|
| GET | `/api/sessions` | 120/min | List agent sessions |
| POST | `/api/sessions` | 30/min | Create session with wallet and limits |
| GET | `/api/sessions/:id` | 120/min | Get a single session |
| PATCH | `/api/sessions/:id` | 30/min | Update status, limits, chains, name |
| POST | `/api/transactions/propose` | 30/min | Propose payment — auto-approve or hold |
| GET | `/api/transactions/history` | 120/min | Paginated transaction log |
| GET | `/api/approvals` | 120/min | List pending approvals |
| PATCH | `/api/approvals/:id` | 30/min | Approve or reject held transaction |
| GET | `/api/chains` | 120/min | List enabled chains + tokens |
| GET | `/api/webhooks` | 120/min | List registered webhooks |
| POST | `/api/webhooks` | 30/min | Register webhook endpoint |
| PATCH | `/api/webhooks/:id` | 30/min | Toggle webhook on/off |
| DELETE | `/api/webhooks/:id` | 30/min | Delete webhook |
| GET | `/api/stats` | 120/min | Observability metrics |
| GET | `/api/audit` | 120/min | Audit trail entries |
| GET | `/api/auth/api-keys` | 120/min | List API keys |
| POST | `/api/auth/api-keys` | 10/min | Generate new API key |
| DELETE | `/api/auth/api-keys/:id` | 30/min | Revoke API key |
| POST | `/api/cron/reset-spend` | — | Reset daily spend (CRON_SECRET) |

## Database Migrations

Migrations live in `supabase/migrations/` and run in alphabetical order. Previous migrations are never modified — additive only.

## Tech Stack

- **Framework**: Next.js 16 (App Router, webpack)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth + API keys (SHA-256)
- **UI**: Tailwind CSS v4, shadcn primitives, Framer Motion
- **Notifications**: Microsoft Teams Adaptive Cards + Custom Webhooks
- **Rate Limiting**: In-memory sliding window (Redis-upgradeable)

## Phases

| Phase | What | Status |
|-------|------|--------|
| 0 | Foundation: middleware, services, errors, migrations | Complete |
| 1 | Auth: API keys, sessions, RLS, security headers | Complete |
| 2 | Multi-Chain: chain adapters, tx log, address validation | Complete |
| 3 | Observability: rate limiting, audit trail, usage tracking | Complete |
| 4 | Webhooks: HMAC delivery, tx history, enhanced dashboard | Complete |
| 5 | SDK: NexusClient, settings UI, polished demo | Complete |
