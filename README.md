# Nexus Core

Control plane for autonomous AI agent payments. Sessions with spending limits, human-in-the-loop approval workflows, and real-time operator dashboard.

## Architecture

```
src/
  app/
    page.tsx                        Dashboard (client component)
    login/page.tsx                  Auth: signup + sign-in
    settings/page.tsx               API key management
    api/
      sessions/         route.ts    GET list, POST create
      sessions/[id]/    route.ts    GET single, PATCH update status/limits
      approvals/        route.ts    GET list (filter by status/session)
      approvals/[id]/   route.ts    PATCH approve/reject
      transactions/propose/ route.ts POST — policy engine: auto-approve or hold
      chains/           route.ts    GET — enabled chains + tokens
      stats/            route.ts    GET — observability metrics (API, tx, sessions)
      audit/            route.ts    GET — audit trail entries
      auth/api-keys/    route.ts    GET list, POST create API key
      auth/api-keys/[id]/ route.ts  DELETE revoke API key
      cron/reset-spend/ route.ts    POST — daily spend counter reset
  lib/
    server/
      middleware.ts                 Composable route middleware (withMiddleware, withErrorHandler)
      auth.ts                       withAuth middleware, API key + session validation
      rate-limit.ts                 withRateLimit middleware (sliding window, per-user)
      usage.ts                      withUsageTracking middleware + usage stats
      errors.ts                     Typed error classes (AppError, NotFoundError, etc.)
      env.ts                        Validated, typed environment config
      services/
        sessions.service.ts         Session CRUD + chain-aware wallet generation
        approvals.service.ts        Approval resolution with spend update
        transactions.service.ts     Policy engine: chain validation, limit checks, tx logging
        audit.service.ts            Immutable audit log append + query
    chains/
      types.ts                      ChainAdapter interface, WalletInfo, TransferParams
      base.ts                       Base chain adapter (simulated transfers in Phase 2)
      registry.ts                   Chain adapter registry + DB config queries
    supabase/
      client.ts                     Browser-safe anon client (lazy proxy)
      server.ts                     Server-only client (service role)
      middleware.ts                 Edge middleware Supabase client
    notify.ts                       Microsoft Teams Adaptive Card notifications
    utils.ts                        Tailwind cn() helper
  components/                       UI: Navbar, HUDOverlay, ThemeToggle, shadcn primitives

supabase/
  migrations/
    001_initial_schema.sql          Sessions + pending_approvals tables
    002_atomic_spend.sql            Race-safe spend increment function
    003_api_keys.sql                API key storage (SHA-256 hashed)
    004_rls_policies.sql            Row Level Security policies
    005_chains_config.sql           Chains + chain_tokens config tables
    006_transaction_log.sql         Immutable transaction ledger
    007_sessions_multi_chain.sql    allowed_chains array on sessions
    008_audit_log.sql               Immutable audit trail
    009_api_usage.sql               API usage metrics
```

## Middleware Pattern

Routes are thin HTTP adapters. Business logic lives in services. Middleware composes right-to-left:

```typescript
export const POST = withMiddleware(
  withErrorHandler,   // Phase 0: structured error responses
  withAuth,           // Phase 1: API key + session authentication
  writeRateLimit,     // Phase 3: sliding window rate limiting
  withUsageTracking,  // Phase 3: API metrics collection
)(async (req) => {
  const userId = getUserId(req);
  const body = await req.json();
  const result = await proposeTransaction(body, userId);
  return NextResponse.json(result);
});
```

Each phase adds middleware — no existing handlers or middleware are modified.

## Quick Start

```bash
# Install
npm install

# Set up Supabase (interactive — creates project, applies migrations, writes .env.local)
npm run setup

# Or manually: copy .env.example → .env.local and fill in values

# Start dev server
npm run dev        # http://localhost:3001

# Test the agent flow
node test-agent.mjs
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Service role key for server-side writes (bypasses RLS) |
| `TEAMS_WEBHOOK_URL` | Optional | Teams incoming webhook for approval alerts |
| `CRON_SECRET` | Optional | Secures the daily spend reset endpoint |
| `NEXT_PUBLIC_APP_URL` | Optional | Dashboard URL for Teams card links (default: `http://localhost:3001`) |

## API

All endpoints require authentication (API key or session cookie) unless noted.

| Method | Endpoint | Rate Limit | Description |
|--------|----------|-----------|-------------|
| GET | `/api/sessions` | 120/min | List agent sessions |
| POST | `/api/sessions` | 30/min | Create session with wallet and limits |
| GET | `/api/sessions/:id` | 120/min | Get a single session |
| PATCH | `/api/sessions/:id` | 30/min | Update status, limits, chains, or name |
| POST | `/api/transactions/propose` | 30/min | Propose payment — auto-approve or hold |
| GET | `/api/approvals` | 120/min | List pending approvals |
| PATCH | `/api/approvals/:id` | 30/min | Approve or reject held transaction |
| GET | `/api/chains` | 120/min | List enabled chains + tokens |
| GET | `/api/stats` | 120/min | Observability metrics (API, tx, sessions) |
| GET | `/api/audit` | 120/min | Audit trail entries |
| GET | `/api/auth/api-keys` | 120/min | List API keys |
| POST | `/api/auth/api-keys` | 10/min | Generate new API key (session auth only) |
| DELETE | `/api/auth/api-keys/:id` | 30/min | Revoke API key |
| POST | `/api/cron/reset-spend` | — | Reset daily spend (CRON_SECRET auth) |

Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are included in every response.

## Database Migrations

Migrations live in `supabase/migrations/` and run in alphabetical order. The setup script applies them automatically. To add a new migration:

1. Create `supabase/migrations/010_your_change.sql`
2. Run `npm run setup` (or apply manually in Supabase SQL editor)

Previous migrations are never modified — this ensures forward compatibility.

## Tech Stack

- **Framework**: Next.js 16 (App Router, webpack)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL + Realtime)
- **UI**: Tailwind CSS v4, shadcn primitives, Framer Motion
- **Notifications**: Microsoft Teams Adaptive Cards
