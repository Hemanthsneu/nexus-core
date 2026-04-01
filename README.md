# Nexus App

Production-ready foundation for a multi-chain payments platform inspired by Nexus Protocol.

## Prerequisites
- Node.js 20+
- npm 10+
- PostgreSQL 14+ (recommended for production mode)

## Environment setup
1. Copy env template:
   - `cp .env.example .env.local`
2. Update `DATABASE_URL` in `.env.local`.
3. Set `NEXUS_ADMIN_API_KEY` in `.env.local` for admin-only operations (for example merchant creation).
4. Set `NEXUS_JOB_RUNNER_KEY` in `.env.local` for secure background job execution.

If `DATABASE_URL` is missing, API routes automatically fall back to in-memory storage for local/demo use.

## Database setup
Apply schema:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

The server also performs defensive `CREATE TABLE IF NOT EXISTS` on first API use.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API notes
- All API routes require API key auth (`x-api-key` or `Authorization: Bearer <key>`).
- `/api/payments` supports idempotency via `idempotencyKey`.
- `/api/agents` and `/api/merchants` persist records in Postgres when configured.
- All APIs return standardized envelopes with `requestId`.
- Basic per-route rate limiting is enabled.
- Webhook delivery for payment lifecycle events is signed and retried.
- Async payment/webhook jobs are persisted in `async_jobs`.
- OpenAPI spec endpoint: `GET /api/openapi`.

### Scope model
- `payments:write`, `payments:read`
- `agents:write`, `agents:read`
- `merchants:write` (admin key recommended)

### Webhook signing
- Header: `x-nexus-signature: sha256=<hex>`
- Header: `x-nexus-event: <event_type>`
- Retries: 3 attempts with exponential backoff via async job runner.
- Exhausted deliveries are written to `webhook_dead_letters`.

### Job runner endpoint
- Route: `POST /api/internal/jobs`
- Auth header: `x-job-runner-key: <NEXUS_JOB_RUNNER_KEY>`
- Body (optional): `{ "limit": 25 }`
- Trigger this endpoint from a scheduler/cron every few seconds in production.

### Observability endpoints
- `GET /api/internal/health` (auth required via internal key)
- `GET /api/internal/metrics` (auth required via internal key)
- Internal metrics include API/job counters and queue status.

## OpenAPI + SDK
- Source spec: `openapi/nexus.v1.json`
- Runtime endpoint: `/api/openapi`
- Validate spec: `npm run openapi:validate`
- Generate SDK types: `npm run sdk:generate`
- Read spec version: `npm run sdk:version`
- SDK scaffold: `src/lib/sdk/nexus-client.ts` + `src/lib/sdk/generated.ts`

## CI quality gate
- Run all backend-safe checks locally: `npm run ci:check`
- Workflow file: `.github/workflows/ci.yml`

## Security baseline
- Security headers are set in `middleware.ts`.
- `x-powered-by` header is disabled.
- IDs and secrets use crypto-safe randomness.

See `PRODUCTION_READINESS.md` for rollout checklist and next hardening tasks.
