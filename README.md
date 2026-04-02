# Nexus Core

Control plane for autonomous AI agent payments. Sessions with spending limits, human-in-the-loop approval workflows, and real-time operator dashboard.

## Architecture

```
src/
  app/
    page.tsx                        Dashboard (client component)
    api/
      sessions/         route.ts    GET list, POST create
      sessions/[id]/    route.ts    GET single, PATCH update status/limits
      approvals/        route.ts    GET list (filter by status/session)
      approvals/[id]/   route.ts    PATCH approve/reject
      transactions/propose/ route.ts POST — policy engine: auto-approve or hold
      cron/reset-spend/ route.ts    POST — daily spend counter reset
  lib/
    server/
      middleware.ts                 Composable route middleware (error handler, future: auth, rate limit)
      errors.ts                     Typed error classes (AppError, NotFoundError, ValidationError, etc.)
      env.ts                        Validated, typed environment config
      services/
        sessions.service.ts         Session CRUD + wallet generation
        approvals.service.ts        Approval resolution with spend update
        transactions.service.ts     Policy engine: limit checks, hold/approve, atomic spend
    supabase/
      client.ts                     Browser-safe anon client (lazy proxy)
      server.ts                     Server-only client (service role when available)
    notify.ts                       Microsoft Teams Adaptive Card notifications
    utils.ts                        Tailwind cn() helper
  components/                       UI: Navbar, HUDOverlay, ThemeToggle, shadcn primitives

supabase/
  migrations/
    001_initial_schema.sql          Sessions + pending_approvals tables
    002_atomic_spend.sql            Race-safe spend increment function
```

## Middleware Pattern

Routes are thin HTTP adapters. Business logic lives in services. Middleware composes around handlers:

```typescript
export const POST = withMiddleware(withErrorHandler)(async (request) => {
  const body = await request.json();
  const result = await proposeTransaction(body);
  return NextResponse.json(result);
});
```

Future phases slot in new middleware without touching handler logic:

```typescript
// Phase 1: add auth
export const POST = withMiddleware(withErrorHandler, withAuth)(handler);

// Phase 2: add rate limiting
export const POST = withMiddleware(withErrorHandler, withAuth, withRateLimit)(handler);
```

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

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | List all agent sessions |
| POST | `/api/sessions` | Create a new session with wallet and limits |
| GET | `/api/sessions/:id` | Get a single session |
| PATCH | `/api/sessions/:id` | Update status, limits, or name |
| POST | `/api/transactions/propose` | Propose a payment — auto-approve or hold |
| GET | `/api/approvals` | List pending approvals |
| PATCH | `/api/approvals/:id` | Approve or reject a held transaction |
| POST | `/api/cron/reset-spend` | Reset daily spend counters |

## Database Migrations

Migrations live in `supabase/migrations/` and run in alphabetical order. The setup script applies them automatically. To add a new migration:

1. Create `supabase/migrations/003_your_change.sql`
2. Run `npm run setup` (or apply manually in Supabase SQL editor)

Previous migrations are never modified — this ensures forward compatibility.

## Tech Stack

- **Framework**: Next.js 16 (App Router, webpack)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL + Realtime)
- **UI**: Tailwind CSS v4, shadcn primitives, Framer Motion
- **Notifications**: Microsoft Teams Adaptive Cards
