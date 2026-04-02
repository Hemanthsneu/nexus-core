# Nexus Core — The Complete Guide

> If you're reading this, you don't need to know anything about the codebase. This document explains what Nexus Core is, what every piece does, why it exists, and how to use it — from scratch.

---

## Table of Contents

1. [What is Nexus Core?](#1-what-is-nexus-core)
2. [The Problem It Solves](#2-the-problem-it-solves)
3. [Core Concepts (Plain English)](#3-core-concepts-plain-english)
4. [How to Set It Up](#4-how-to-set-it-up)
5. [Using the Dashboard](#5-using-the-dashboard)
6. [Using the API (For Developers / Agents)](#6-using-the-api-for-developers--agents)
7. [The Complete Transaction Flow](#7-the-complete-transaction-flow)
8. [Security — How It Keeps Things Safe](#8-security--how-it-keeps-things-safe)
9. [Webhooks — Getting Notified in Real Time](#9-webhooks--getting-notified-in-real-time)
10. [Monitoring — Seeing What's Happening](#10-monitoring--seeing-whats-happening)
11. [Multi-Chain Support](#11-multi-chain-support)
12. [Every API Endpoint Explained](#12-every-api-endpoint-explained)
13. [The Database — What's Stored and Why](#13-the-database--whats-stored-and-why)
14. [How the Codebase Is Organized](#14-how-the-codebase-is-organized)
15. [Running the Demo](#15-running-the-demo)
16. [Glossary](#16-glossary)

---

## 1. What is Nexus Core?

Nexus Core is a **control plane for AI agent payments**.

In simpler terms: imagine you have an AI assistant that needs to spend money on your behalf — buying API credits, paying for cloud compute, settling invoices, booking flights. Right now, you'd have to give it your credit card or a crypto wallet's private key with no spending limits. That's dangerous.

Nexus Core sits in between. It gives each AI agent a **session** with:
- A wallet address (where money lives)
- A daily spending limit (e.g., "max $100/day")
- A per-transaction limit (e.g., "max $20 per purchase")
- Rules about which blockchains it can use

If the agent tries to spend within its limits, the transaction goes through automatically. If it tries to spend more than allowed, the transaction is **held** and a human gets notified to approve or reject it.

Think of it like a **corporate expense card for AI agents** — but on blockchain rails instead of Visa.

---

## 2. The Problem It Solves

| Without Nexus | With Nexus |
|---------------|------------|
| Agent has unlimited access to your wallet | Agent has a budget with hard limits |
| No way to know what the agent spent on | Every transaction is logged with full audit trail |
| No approval process for large purchases | Transactions over the limit require human approval |
| One wallet key = full access forever | Session keys can be paused or revoked instantly |
| No visibility into agent activity | Real-time dashboard with stats and history |
| No notifications when something happens | Teams notifications + custom webhooks |

---

## 3. Core Concepts (Plain English)

### Session

A **session** is like opening a tab at a bar. You tell the bartender "I'm good for $100 tonight, max $20 per drink." The session tracks:
- Which agent is using it (a name you pick)
- A wallet address (auto-generated)
- How much has been spent today
- The daily and per-transaction spending limits
- Which blockchain(s) it's allowed to use
- Whether it's active, paused, or revoked

### Transaction

When an agent wants to spend money, it **proposes a transaction**. The system checks:
1. Is the session active?
2. Is this blockchain allowed for this session?
3. Is the destination address valid?
4. Is the amount under the per-transaction limit?
5. Would this push today's total over the daily limit?

If everything passes, the transaction is **approved** automatically. If any limit is exceeded, it's **held** for human review.

### Approval

When a transaction is held, it creates a **pending approval**. This is a request sitting in a queue, waiting for a human to look at it and either:
- **Approve it** — the spend goes through and the session's daily total is updated
- **Reject it** — the spend is denied and nothing happens

### API Key

An **API key** is a password that lets a program talk to Nexus. It looks like `nx_a3f8b2...` and is used in every API request. You create API keys from the dashboard, and each key is tied to your account — an agent using your key can only see and manage your sessions.

### Webhook

A **webhook** is a URL that Nexus calls when something happens. For example, if you register `https://your-app.com/nexus-events`, Nexus will POST a message to that URL every time a transaction is approved, held, or a session is created. This lets you build automations on top of Nexus without constantly polling for updates.

---

## 4. How to Set It Up

### Prerequisites

- **Node.js 18+** installed
- A **Supabase** account (free tier works fine — [supabase.com](https://supabase.com))

### Step-by-step

```bash
# 1. Clone the repo and install dependencies
cd nexus-core
npm install

# 2. Create a Supabase project at supabase.com
#    Copy your project URL and keys from Settings → API

# 3. Create your environment file
cp .env.example .env.local
```

Open `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

The `SUPABASE_SERVICE_ROLE_KEY` is found in your Supabase dashboard under **Settings → API → service_role key** (the one that says "secret"). This key lets the server bypass database security rules — it's only used server-side, never exposed to the browser.

```bash
# 4. Apply the database schema
npm run setup

# 5. Start the application
npm run dev
```

Open http://localhost:3001. You should see the login page.

### Optional: Teams Notifications

If you want held transactions to send alerts to Microsoft Teams:

1. In Teams, go to a channel → Connectors → Incoming Webhook → Create
2. Copy the webhook URL
3. Add to `.env.local`:
   ```
   TEAMS_WEBHOOK_URL=https://your-teams-webhook-url
   ```

---

## 5. Using the Dashboard

### Signing Up

1. Go to http://localhost:3001 — you'll be redirected to `/login`
2. Enter an email and password, click **Sign Up**
3. You'll be redirected to the dashboard

### Dashboard — Overview Tab

This is your command center. You'll see:

**Top stats row (8 cards):**
- **Active Agents** — how many sessions are currently running
- **24h Spend** — total money spent across all agents today
- **Pending Approvals** — transactions waiting for your decision (has a pulsing dot if > 0)
- **API Calls (24h)** — how many API requests hit your account, with average response time
- **Transactions (24h)** — total transactions and dollar volume
- **Approved / Held** — breakdown of auto-approved vs. held-for-review
- **Total Sessions** — all sessions ever created (active + paused + revoked)

**Left panel — Registered Sessions:**

Each session card shows:
- Agent name and wallet address
- Status badge (active / paused / revoked)
- Spend progress bar (how much of today's limit is used)
- Per-transaction limit and which chain(s) are allowed
- Buttons to Pause / Resume / Revoke

Click **"+ New Agent Session"** to create one with default limits ($100/day, $20/tx).

**Right panel — Authorization Queue:**

When a transaction exceeds limits, it appears here as a card with:
- The dollar amount
- Which agent tried to send it
- The destination address
- The reason it was held (e.g., "Exceeds per-transaction limit")
- **APPROVE** and **REJECT** buttons

### Dashboard — Transactions Tab

A table showing every transaction ever processed:
- Timestamp, agent name, amount, chain/token
- Outcome (approved in green, held in yellow, rejected in red)
- Destination address and transaction hash

### Dashboard — Activity Tab

The audit trail — a chronological log of everything that happened:
- Session created/paused/revoked/resumed
- Transactions approved/held
- Approvals resolved
- API keys created/revoked
- Each entry shows the exact time, action type, and whether it succeeded

### Settings Page

Navigate via the **"API Keys"** link in the navbar.

**API Keys tab:**
- Generate new API keys (the raw key is shown once — copy it immediately)
- See all your keys with their prefix, creation date, and last used date
- Revoke keys you no longer need

**Webhooks tab:**
- Register webhook URLs to receive real-time event notifications
- Pick which events you care about (all, or specific ones like `transaction.approved`)
- The signing secret is shown once — use it to verify webhook payloads
- Toggle webhooks on/off, or delete them

---

## 6. Using the API (For Developers / Agents)

Every API request needs an API key in the header:

```
Authorization: Bearer nx_your_api_key_here
```

### Quick Start Example

```bash
# Create a session
curl -X POST http://localhost:3001/api/sessions \
  -H "Authorization: Bearer nx_your_key" \
  -H "Content-Type: application/json" \
  -d '{"agent_name": "My Agent", "daily_limit": 100, "per_tx_limit": 20}'

# Propose a transaction
curl -X POST http://localhost:3001/api/transactions/propose \
  -H "Authorization: Bearer nx_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "the-session-id-from-above",
    "amount": 15,
    "destination_address": "0x1234567890abcdef1234567890abcdef12345678",
    "chain": "base",
    "token": "USDC"
  }'
```

### Using the TypeScript SDK

If you're building in TypeScript/JavaScript, there's a built-in SDK:

```typescript
import { NexusClient } from '@/sdk';

const nexus = new NexusClient({
  apiKey: 'nx_your_key',
  baseUrl: 'http://localhost:3001',
});

// Create a session
const session = await nexus.sessions.create({
  agent_name: 'Shopping Agent',
  daily_limit: 50,
  per_tx_limit: 10,
  allowed_chains: ['base'],
});

// Send money
const result = await nexus.transactions.propose({
  session_id: session.id,
  amount: 8,
  destination_address: '0xabc...',
  chain: 'base',
  token: 'USDC',
});

if (result.status === 'APPROVE') {
  console.log('Done! TX hash:', result.tx_hash);
} else {
  console.log('Needs approval:', result.reason);
}

// Check what happened
const history = await nexus.transactions.history({ session_id: session.id });
console.log(history.transactions);

// See overall stats
const stats = await nexus.stats.get(24); // last 24 hours
console.log('Total volume:', stats.transactions.volume_usd);
```

The SDK has methods for everything: `sessions`, `transactions`, `approvals`, `chains`, `webhooks`, `stats`, and `audit`.

---

## 7. The Complete Transaction Flow

Here's what happens step-by-step when an agent proposes a transaction:

```
Agent calls POST /api/transactions/propose
       │
       ▼
┌─────────────────────────┐
│  1. Authentication      │  Is the API key valid? → 401 if not
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│  2. Rate Limiting       │  Has this user exceeded 30 writes/min? → 429 if yes
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│  3. Session Lookup      │  Does this session exist and belong to this user? → 404 if not
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│  4. Session Status      │  Is the session active? → 403 if paused/revoked
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│  5. Chain Validation    │  Is "base" in this session's allowed_chains? → 403 if not
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│  6. Address Validation  │  Is the destination a valid Base address? → 400 if not
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│  7. Limit Check         │  Is $15 ≤ per_tx_limit ($20)? Is spend_today + $15 ≤ daily_limit?
└────────┬────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
 APPROVE     HOLD
    │         │
    │         ├─ Create pending approval
    │         ├─ Log to transaction_log (outcome: "held")
    │         ├─ Send Teams notification
    │         ├─ Fire webhook: transaction.held
    │         └─ Return 202 with approval_id
    │
    ├─ Update spend_today atomically
    ├─ Execute transfer via chain adapter (simulated for now)
    ├─ Log to transaction_log (outcome: "approved", tx_hash)
    ├─ Fire webhook: transaction.approved
    ├─ Write audit log entry
    └─ Return 200 with tx_hash, new spend total
```

Every step is logged. The audit trail records who did what, when, and from which IP address.

---

## 8. Security — How It Keeps Things Safe

### Authentication (Two Ways In)

1. **API Keys** — for programmatic access (agents, scripts, other services). Keys start with `nx_` and are stored as SHA-256 hashes in the database. Even if the database is compromised, the raw keys are unrecoverable.

2. **Session Cookies** — for the dashboard. When you log in via the browser, Supabase sets an encrypted cookie that the server reads on each request.

### Data Isolation

Every user only sees their own data. If User A creates 3 sessions and User B creates 5 sessions, User A's API key will only return their 3 sessions. This is enforced at two levels:
- **Application level** — every database query filters by the authenticated user's ID
- **Database level** — PostgreSQL Row Level Security (RLS) policies ensure that even a bug in the application code can't leak data between users

### Rate Limiting

Every API endpoint has a request limit to prevent abuse:
- **Read endpoints** (GET): 120 requests per minute
- **Write endpoints** (POST/PATCH/DELETE): 30 requests per minute
- **Auth endpoints** (creating API keys): 10 requests per minute

When you're close to the limit, the response headers tell you:
- `X-RateLimit-Limit: 30` — your maximum
- `X-RateLimit-Remaining: 12` — how many you have left
- `X-RateLimit-Reset: 1735689600` — when the window resets (Unix timestamp)

If you exceed the limit, you get a `429 Too Many Requests` with a `Retry-After` header.

### Security Headers

Every response from Nexus includes:
- `X-Content-Type-Options: nosniff` — prevents browser MIME-sniffing
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-XSS-Protection: 1; mode=block` — enables browser XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer data leakage

### Atomic Spend Updates

When a transaction is approved, the `spend_today` counter is incremented using a PostgreSQL function (`increment_spend`) that guarantees atomicity. Even if two transactions hit at the exact same millisecond, they won't create a race condition where the daily limit is accidentally exceeded.

---

## 9. Webhooks — Getting Notified in Real Time

### What Gets Sent

When you register a webhook, Nexus will POST to your URL whenever matching events occur:

| Event | When It Fires |
|-------|---------------|
| `transaction.approved` | An agent's transaction was auto-approved within limits |
| `transaction.held` | A transaction exceeded limits and is waiting for review |
| `approval.resolved` | A held transaction was approved or rejected by a human |
| `session.created` | A new agent session was created |
| `session.updated` | A session's limits, name, or chains were changed |
| `session.revoked` | A session was permanently revoked |

### Payload Format

```json
{
  "event": "transaction.approved",
  "data": {
    "session_id": "abc-123",
    "amount": 15,
    "destination_address": "0x...",
    "chain": "base",
    "token": "USDC",
    "tx_hash": "0x..."
  },
  "timestamp": "2026-03-30T12:00:00.000Z"
}
```

### Verifying Signatures

Every webhook request includes an `X-Nexus-Signature` header. This is an HMAC-SHA256 hash of the request body, signed with the secret you received when creating the webhook. To verify:

```javascript
const crypto = require('crypto');

function verifyWebhook(body, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expected === signature;
}
```

This proves the request genuinely came from Nexus and wasn't tampered with.

### Retry Behavior

If your server returns a non-2xx response (or times out after 10 seconds), Nexus retries:
- **Attempt 2**: after 2 seconds
- **Attempt 3**: after 4 seconds

All delivery attempts are logged in the `webhook_deliveries` table.

---

## 10. Monitoring — Seeing What's Happening

### Stats API

`GET /api/stats?hours=24` returns a snapshot of everything:

```json
{
  "period_hours": 24,
  "api": {
    "total_calls": 847,
    "avg_latency_ms": 142,
    "error_count": 3,
    "error_rate": 0.4,
    "by_path": { "/api/transactions/propose": 312, "/api/sessions": 205 },
    "by_status": { "2xx": 841, "4xx": 5, "5xx": 1 }
  },
  "transactions": {
    "total": 312,
    "volume_usd": 4250.00,
    "by_outcome": { "approved": 280, "held": 28, "rejected": 4 }
  },
  "sessions": {
    "total": 15,
    "active": 12,
    "total_spend_today": 1840.50
  }
}
```

### Audit Trail

`GET /api/audit?limit=50` returns the last 50 actions:

```json
{
  "entries": [
    {
      "action": "transaction.approve",
      "resource_type": "transaction",
      "outcome": "success",
      "created_at": "2026-03-30T11:47:13Z",
      "metadata": { "session_id": "abc", "amount": 15, "chain": "base" }
    }
  ]
}
```

You can filter by action type: `?action=session.create` or `?action=transaction.hold`.

### Microsoft Teams Notifications

When a transaction is held for review, a rich notification card is posted to your Teams channel showing:
- The agent name and wallet address
- How much it tried to spend and where
- Why it was held
- A link to the dashboard to approve/reject

---

## 11. Multi-Chain Support

Nexus supports multiple blockchains through a **chain adapter** pattern. Currently, **Base** (an Ethereum L2) is live with USDC. The system is designed so adding a new chain requires:
1. Writing a new adapter file (e.g., `src/lib/chains/ethereum.ts`)
2. Registering it in the registry
3. Inserting a row into the `chains` database table

No existing code needs to change.

### How It Works

When you create a session, you specify which chains it can use:

```json
{ "allowed_chains": ["base"] }
```

When a transaction is proposed, the system:
1. Checks if the requested chain is in the session's allowed list
2. Validates the destination address using the chain's adapter (different chains have different address formats)
3. Executes the transfer through the adapter

The chains API (`GET /api/chains`) tells you what's available:

```json
[
  {
    "id": "base",
    "display_name": "Base",
    "native_token": "ETH",
    "tokens": [{ "symbol": "USDC", "decimals": 6 }]
  }
]
```

---

## 12. Every API Endpoint Explained

### Sessions — Managing Agent Accounts

| Endpoint | What It Does |
|----------|-------------|
| `GET /api/sessions` | Lists all your sessions. Returns an array of session objects. |
| `POST /api/sessions` | Creates a new session. Send `agent_name`, `daily_limit`, `per_tx_limit`, and optionally `allowed_chains`. Returns the session with a generated wallet address. |
| `GET /api/sessions/:id` | Gets one specific session by its ID. |
| `PATCH /api/sessions/:id` | Updates a session. You can change `status` (active/paused/revoked), `daily_limit`, `per_tx_limit`, `agent_name`, or `allowed_chains`. |

### Transactions — Spending Money

| Endpoint | What It Does |
|----------|-------------|
| `POST /api/transactions/propose` | The core endpoint. Send `session_id`, `amount`, `destination_address`, and optionally `chain` and `token`. Returns either APPROVE (with tx_hash) or HOLD (with approval_id). |
| `GET /api/transactions/history` | Lists past transactions. Supports `?limit=`, `?offset=`, `?chain=`, `?outcome=`, `?session_id=` filters. |

### Approvals — Human-in-the-Loop

| Endpoint | What It Does |
|----------|-------------|
| `GET /api/approvals` | Lists approvals. Defaults to `?status=pending`. Use `?status=all` for everything. |
| `PATCH /api/approvals/:id` | Resolves an approval. Send `{"action": "approve"}` or `{"action": "reject"}`. |

### Chains — What's Supported

| Endpoint | What It Does |
|----------|-------------|
| `GET /api/chains` | Lists all enabled blockchains and their supported tokens. |

### Webhooks — Event Subscriptions

| Endpoint | What It Does |
|----------|-------------|
| `GET /api/webhooks` | Lists your registered webhooks. |
| `POST /api/webhooks` | Registers a new webhook. Send `url` (must be https), `events` array, and optional `description`. Returns the webhook with its signing `secret` (shown once). |
| `PATCH /api/webhooks/:id` | Toggles a webhook on or off. Send `{"enabled": false}`. |
| `DELETE /api/webhooks/:id` | Permanently deletes a webhook. |

### Observability — Stats & Audit

| Endpoint | What It Does |
|----------|-------------|
| `GET /api/stats` | Aggregated metrics. Use `?hours=24` (max 168) for the time window. Returns API call counts, transaction volume, session stats. |
| `GET /api/audit` | Audit trail. Supports `?limit=`, `?offset=`, `?action=`. Returns timestamped entries of every action taken. |

### Auth — API Key Management

| Endpoint | What It Does |
|----------|-------------|
| `GET /api/auth/api-keys` | Lists your API keys (prefix only, never the full key). |
| `POST /api/auth/api-keys` | Generates a new API key. Returns the raw key once — you must copy it. Only works from a browser session (not from another API key). |
| `DELETE /api/auth/api-keys/:id` | Revokes an API key. It stops working immediately. |

### System

| Endpoint | What It Does |
|----------|-------------|
| `POST /api/cron/reset-spend` | Resets all sessions' `spend_today` to zero. Protected by `CRON_SECRET`. Call this daily to reset spending counters. |

---

## 13. The Database — What's Stored and Why

Everything lives in a PostgreSQL database hosted on Supabase. Here's every table:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `sessions` | Agent sessions with wallets and limits | id, agent_name, wallet_address, daily_limit, per_tx_limit, spend_today, status, allowed_chains, user_id |
| `pending_approvals` | Held transactions waiting for human review | id, session_id, amount, destination_address, reason, status (pending/approved/rejected) |
| `api_keys` | Hashed API keys for programmatic auth | id, user_id, key_hash (SHA-256), key_prefix, revoked_at |
| `chains` | Supported blockchains | id (e.g., "base"), display_name, native_token, enabled |
| `chain_tokens` | Tokens available on each chain | chain_id, symbol (e.g., "USDC"), contract_address, decimals |
| `transaction_log` | Immutable record of every transaction | session_id, user_id, chain_id, token, amount, outcome, tx_hash |
| `audit_log` | Immutable record of every action taken | user_id, action, resource_type, resource_id, ip_address, metadata |
| `api_usage` | Every API call with latency | user_id, method, path, status_code, latency_ms |
| `webhooks` | Registered webhook endpoints | user_id, url, secret (HMAC key), events, enabled |
| `webhook_deliveries` | Delivery log for each webhook attempt | webhook_id, event_type, status_code, attempt, delivered |

The `transaction_log` and `audit_log` tables are **append-only** — rows are never updated or deleted. This creates a tamper-proof history.

---

## 14. How the Codebase Is Organized

```
nexus-core/
├── src/
│   ├── app/                          ← Pages and API routes (Next.js App Router)
│   │   ├── page.tsx                  ← Dashboard (Overview / Transactions / Activity tabs)
│   │   ├── login/page.tsx            ← Sign up and sign in
│   │   ├── settings/page.tsx         ← API Keys and Webhooks management
│   │   └── api/                      ← All 19 API endpoints
│   │
│   ├── sdk/index.ts                  ← TypeScript SDK (NexusClient class)
│   │
│   ├── lib/
│   │   ├── server/                   ← Server-only code (never runs in browser)
│   │   │   ├── middleware.ts         ← Request pipeline: error handling, auth, rate limiting
│   │   │   ├── auth.ts              ← API key validation, session validation
│   │   │   ├── rate-limit.ts        ← Sliding window rate limiter
│   │   │   ├── usage.ts             ← API usage tracking
│   │   │   ├── errors.ts            ← Error types (NotFound, Unauthorized, etc.)
│   │   │   └── services/            ← Business logic (sessions, transactions, approvals, etc.)
│   │   │
│   │   ├── chains/                   ← Blockchain adapters
│   │   │   ├── types.ts             ← ChainAdapter interface
│   │   │   ├── base.ts              ← Base chain implementation
│   │   │   └── registry.ts          ← Maps chain IDs to adapters
│   │   │
│   │   ├── supabase/                 ← Database client setup
│   │   └── notify.ts                ← Teams notification sender
│   │
│   └── components/                   ← UI components (Navbar, theme toggle, etc.)
│
├── supabase/migrations/              ← 10 SQL files defining the database schema
├── test-agent.mjs                    ← Demo script showing the full agent flow
├── .env.example                      ← Template for environment variables
└── package.json
```

### The Middleware Pattern

Every API route looks like this:

```
Request → Error Handler → Auth → Rate Limit → Usage Tracking → Your Code → Response
```

Each middleware is a wrapper around the next one. This means:
- If auth fails, rate limiting and your code never run
- If rate limit is exceeded, your code never runs
- Errors at any step are caught and turned into clean JSON responses
- Usage is tracked after your code runs (to measure real latency)

New capabilities (like IP whitelisting) can be added by writing a new middleware function and slotting it into the chain — no existing code changes.

---

## 15. Running the Demo

The `test-agent.mjs` script demonstrates the complete agent lifecycle in 8 steps:

```bash
# First, create an API key from the dashboard (Settings → API Keys → Generate Key)
# Then run:
API_KEY=nx_your_key node test-agent.mjs
```

What it does:
1. **Discovers chains** — asks the API what blockchains are available
2. **Creates a session** — opens a new agent session with $100/day, $15/tx limits
3. **Runs 3 transactions** — $5 (approved), $8 (approved), $20 (held because > $15 limit)
4. **Resolves the held transaction** — approves it programmatically
5. **Shows transaction history** — lists all 3 transactions with outcomes
6. **Manages the session** — pauses and resumes it
7. **Checks observability** — shows API call count, transaction volume, session stats
8. **Displays audit trail** — shows the last 5 actions taken

The entire demo runs in about 20 seconds.

---

## 16. Glossary

| Term | Meaning |
|------|---------|
| **Agent** | An AI program (like ChatGPT, a LangChain bot, etc.) that needs to spend money |
| **Session** | A controlled account for an agent with spending limits and a wallet |
| **Wallet Address** | A blockchain address (like `0x1234...`) where the agent's funds live |
| **Transaction** | A request to move money from the agent's wallet to a destination |
| **Approval** | A held transaction that needs a human to approve or reject it |
| **API Key** | A credential (starts with `nx_`) used to authenticate API requests |
| **Webhook** | A URL that Nexus calls when events happen (transactions, approvals, etc.) |
| **Chain** | A blockchain network (e.g., Base, Ethereum, Polygon) |
| **Token** | A type of currency on a chain (e.g., USDC on Base) |
| **RLS** | Row Level Security — database rules that prevent users from seeing each other's data |
| **HMAC** | Hash-based Message Authentication Code — used to verify webhook signatures |
| **Audit Trail** | An immutable log of every action taken in the system |
| **Rate Limit** | A cap on how many API requests you can make per minute |
| **Middleware** | Code that runs before your API handler to check auth, rate limits, etc. |
| **Supabase** | The hosted PostgreSQL database service we use for storage and authentication |
