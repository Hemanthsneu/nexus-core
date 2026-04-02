/**
 * Nexus Agent SDK
 *
 * Typed client for the Nexus Control Plane API. Works in Node.js, Deno, and
 * modern browsers. Zero dependencies — uses native fetch.
 *
 * Usage:
 *   import { NexusClient } from '@/sdk';
 *   const nexus = new NexusClient({ apiKey: 'nx_...', baseUrl: 'http://localhost:3001' });
 *   const session = await nexus.sessions.create({ agent_name: 'My Agent', daily_limit: 100 });
 */

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────

export type NexusConfig = {
  apiKey: string;
  baseUrl?: string;
};

export type Session = {
  id: string;
  agent_name: string;
  wallet_address: string;
  daily_limit: number;
  per_tx_limit: number;
  spend_today: number;
  allowed_chain: string;
  allowed_chains: string[];
  allowed_token: string;
  status: 'active' | 'paused' | 'revoked';
  created_at: string;
};

export type CreateSessionInput = {
  agent_name?: string;
  daily_limit?: number;
  per_tx_limit?: number;
  allowed_chains?: string[];
  allowed_token?: string;
};

export type UpdateSessionInput = {
  status?: 'active' | 'paused' | 'revoked';
  daily_limit?: number;
  per_tx_limit?: number;
  agent_name?: string;
  allowed_chains?: string[];
};

export type ProposeInput = {
  session_id: string;
  amount: number;
  destination_address: string;
  chain?: string;
  token?: string;
};

export type ApproveResult = {
  status: 'APPROVE';
  message: string;
  amount: number;
  spend_today: number;
  daily_limit: number;
  tx_hash: string | null;
  chain: string;
  token: string;
};

export type HoldResult = {
  status: 'HOLD';
  message: string;
  approval_id: string;
  reason: string;
};

export type ProposeResult = ApproveResult | HoldResult;

export type Approval = {
  id: string;
  session_id: string;
  amount: number;
  destination_address: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type ResolveResult = {
  id: string;
  status: string;
  resolved_at: string;
};

export type Chain = {
  id: string;
  display_name: string;
  native_token: string;
  enabled: boolean;
  tokens: { chain_id: string; symbol: string; decimals: number }[];
};

export type TransactionEntry = {
  id: string;
  session_id: string;
  amount: number;
  destination_address: string;
  outcome: string;
  chain_id: string;
  token: string;
  tx_hash: string | null;
  created_at: string;
};

export type TransactionHistoryResponse = {
  transactions: TransactionEntry[];
  total: number;
  limit: number;
  offset: number;
};

export type AuditEntry = {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  outcome: string;
  created_at: string;
  metadata: Record<string, unknown>;
};

export type Stats = {
  period_hours: number;
  api: {
    total_calls: number;
    avg_latency_ms: number;
    error_count: number;
    error_rate: number;
    by_path: Record<string, number>;
    by_status: Record<string, number>;
  };
  transactions: {
    total: number;
    volume_usd: number;
    by_outcome: Record<string, number>;
  };
  sessions: {
    total: number;
    active: number;
    total_spend_today: number;
  };
};

export type Webhook = {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  description: string | null;
  created_at: string;
  secret?: string;
};

export type CreateWebhookInput = {
  url: string;
  events?: string[];
  description?: string;
};

export type NexusError = {
  error: string;
  code?: string;
  status: number;
};

// ────────────────────────────────────────────────────────
// Client
// ────────────────────────────────────────────────────────

export class NexusClient {
  private baseUrl: string;
  private apiKey: string;

  public sessions: SessionsResource;
  public transactions: TransactionsResource;
  public approvals: ApprovalsResource;
  public chains: ChainsResource;
  public webhooks: WebhooksResource;
  public stats: StatsResource;
  public audit: AuditResource;

  constructor(config: NexusConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'http://localhost:3001').replace(/\/$/, '');

    this.sessions = new SessionsResource(this);
    this.transactions = new TransactionsResource(this);
    this.approvals = new ApprovalsResource(this);
    this.chains = new ChainsResource(this);
    this.webhooks = new WebhooksResource(this);
    this.stats = new StatsResource(this);
    this.audit = new AuditResource(this);
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
      const err = new Error(data.error ?? `HTTP ${res.status}`) as Error & NexusError;
      err.status = res.status;
      err.code = data.code;
      throw err;
    }

    return data as T;
  }
}

// ────────────────────────────────────────────────────────
// Resources
// ────────────────────────────────────────────────────────

class SessionsResource {
  constructor(private client: NexusClient) {}

  list(): Promise<Session[]> {
    return this.client.request('GET', '/api/sessions');
  }

  get(id: string): Promise<Session> {
    return this.client.request('GET', `/api/sessions/${id}`);
  }

  create(input: CreateSessionInput): Promise<Session> {
    return this.client.request('POST', '/api/sessions', input);
  }

  update(id: string, input: UpdateSessionInput): Promise<Session> {
    return this.client.request('PATCH', `/api/sessions/${id}`, input);
  }

  pause(id: string): Promise<Session> {
    return this.update(id, { status: 'paused' });
  }

  resume(id: string): Promise<Session> {
    return this.update(id, { status: 'active' });
  }

  revoke(id: string): Promise<Session> {
    return this.update(id, { status: 'revoked' });
  }
}

class TransactionsResource {
  constructor(private client: NexusClient) {}

  propose(input: ProposeInput): Promise<ProposeResult> {
    return this.client.request('POST', '/api/transactions/propose', input);
  }

  history(params?: {
    limit?: number;
    offset?: number;
    chain?: string;
    outcome?: string;
    session_id?: string;
  }): Promise<TransactionHistoryResponse> {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.chain) qs.set('chain', params.chain);
    if (params?.outcome) qs.set('outcome', params.outcome);
    if (params?.session_id) qs.set('session_id', params.session_id);
    const query = qs.toString();
    return this.client.request('GET', `/api/transactions/history${query ? '?' + query : ''}`);
  }
}

class ApprovalsResource {
  constructor(private client: NexusClient) {}

  list(params?: { status?: string; session_id?: string }): Promise<Approval[]> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.session_id) qs.set('session_id', params.session_id);
    const query = qs.toString();
    return this.client.request('GET', `/api/approvals${query ? '?' + query : ''}`);
  }

  approve(id: string): Promise<ResolveResult> {
    return this.client.request('PATCH', `/api/approvals/${id}`, { action: 'approve' });
  }

  reject(id: string): Promise<ResolveResult> {
    return this.client.request('PATCH', `/api/approvals/${id}`, { action: 'reject' });
  }
}

class ChainsResource {
  constructor(private client: NexusClient) {}

  list(): Promise<Chain[]> {
    return this.client.request('GET', '/api/chains');
  }
}

class WebhooksResource {
  constructor(private client: NexusClient) {}

  list(): Promise<Webhook[]> {
    return this.client.request('GET', '/api/webhooks');
  }

  create(input: CreateWebhookInput): Promise<Webhook> {
    return this.client.request('POST', '/api/webhooks', input);
  }

  delete(id: string): Promise<{ id: string; deleted: boolean }> {
    return this.client.request('DELETE', `/api/webhooks/${id}`);
  }

  toggle(id: string, enabled: boolean): Promise<Webhook> {
    return this.client.request('PATCH', `/api/webhooks/${id}`, { enabled });
  }
}

class StatsResource {
  constructor(private client: NexusClient) {}

  get(hours?: number): Promise<Stats> {
    const qs = hours ? `?hours=${hours}` : '';
    return this.client.request('GET', `/api/stats${qs}`);
  }
}

class AuditResource {
  constructor(private client: NexusClient) {}

  list(params?: { limit?: number; offset?: number; action?: string }): Promise<{ entries: AuditEntry[]; limit: number; offset: number }> {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.action) qs.set('action', params.action);
    const query = qs.toString();
    return this.client.request('GET', `/api/audit${query ? '?' + query : ''}`);
  }
}
