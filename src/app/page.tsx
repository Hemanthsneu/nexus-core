'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

type Session = {
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

type Approval = {
  id: string;
  session_id: string;
  amount: number;
  destination_address: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  sessions: { agent_name: string; wallet_address: string } | null;
};

type TxEntry = {
  id: string;
  session_id: string;
  amount: number;
  destination_address: string;
  outcome: string;
  chain_id: string;
  token: string;
  tx_hash: string | null;
  created_at: string;
  sessions: { agent_name: string } | null;
};

type AuditEntry = {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  outcome: string;
  created_at: string;
  metadata: Record<string, unknown>;
};

type Stats = {
  api: { total_calls: number; avg_latency_ms: number; error_rate: number; by_status: Record<string, number> };
  transactions: { total: number; volume_usd: number; by_outcome: Record<string, number> };
  sessions: { total: number; active: number; total_spend_today: number };
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-primary/20 text-primary',
  paused: 'bg-yellow-500/20 text-yellow-400',
  revoked: 'bg-destructive/20 text-destructive',
};

const OUTCOME_COLORS: Record<string, string> = {
  approved: 'text-green-400',
  held: 'text-yellow-400',
  rejected: 'text-red-400',
};

const TABS = ['Overview', 'Transactions', 'Activity'] as const;
type Tab = (typeof TABS)[number];

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>('Overview');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [transactions, setTransactions] = useState<TxEntry[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const totalSpend = sessions.reduce((sum, s) => sum + Number(s.spend_today), 0);
  const activeSessionsCount = sessions.filter((s) => s.status === 'active').length;
  const pendingQueueCount = approvals.length;

  const fetchData = useCallback(async () => {
    const [{ data: sData }, { data: aData }] = await Promise.all([
      supabase.from('sessions').select('*').order('created_at', { ascending: false }),
      supabase
        .from('pending_approvals')
        .select('*, sessions(agent_name, wallet_address)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);
    if (sData) setSessions(sData as Session[]);
    if (aData) setApprovals(aData as Approval[]);
    setLoaded(true);
  }, []);

  const fetchTransactions = useCallback(async () => {
    const res = await fetch('/api/transactions/history?limit=100');
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions ?? []);
    }
  }, []);

  const fetchAudit = useCallback(async () => {
    const res = await fetch('/api/audit?limit=100');
    if (res.ok) {
      const data = await res.json();
      setAuditEntries(data.entries ?? []);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/stats?hours=24');
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [fetchData, fetchStats]);

  useEffect(() => {
    if (tab === 'Transactions') fetchTransactions();
    if (tab === 'Activity') fetchAudit();
  }, [tab, fetchTransactions, fetchAudit]);

  const handleCreateSession = async () => {
    setActionLoading('create');
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_limit: 100, per_tx_limit: 20, agent_name: `Agent-${Date.now()}` }),
    });
    await fetchData();
    fetchStats();
    setActionLoading(null);
  };

  const handleSetStatus = async (id: string, status: 'active' | 'paused' | 'revoked') => {
    setActionLoading(id + status);
    await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await fetchData();
    fetchStats();
    setActionLoading(null);
  };

  const handleResolveApproval = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id + action);
    await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    await fetchData();
    fetchStats();
    setActionLoading(null);
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="mono-label">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground mb-2">
            Nexus Control Plane
          </h1>
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
            Multi-Chain Agent Payments · Observability · Webhooks / V4.0
          </p>
        </div>
        <button
          onClick={handleCreateSession}
          disabled={actionLoading === 'create'}
          className="sutera-btn group disabled:opacity-50"
        >
          <span className="relative z-10">
            {actionLoading === 'create' ? 'Creating...' : '+ New Agent Session'}
          </span>
        </button>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors
              ${tab === t ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t}
            {t === 'Overview' && pendingQueueCount > 0 && (
              <span className="ml-2 inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      {tab === 'Overview' && (
        <OverviewTab
          sessions={sessions}
          approvals={approvals}
          stats={stats}
          totalSpend={totalSpend}
          activeCount={activeSessionsCount}
          pendingCount={pendingQueueCount}
          actionLoading={actionLoading}
          onSetStatus={handleSetStatus}
          onResolveApproval={handleResolveApproval}
        />
      )}
      {tab === 'Transactions' && <TransactionsTab transactions={transactions} />}
      {tab === 'Activity' && <ActivityTab entries={auditEntries} />}
    </div>
  );
}

function OverviewTab({
  sessions, approvals, stats, totalSpend, activeCount, pendingCount,
  actionLoading, onSetStatus, onResolveApproval,
}: {
  sessions: Session[];
  approvals: Approval[];
  stats: Stats | null;
  totalSpend: number;
  activeCount: number;
  pendingCount: number;
  actionLoading: string | null;
  onSetStatus: (id: string, status: 'active' | 'paused' | 'revoked') => void;
  onResolveApproval: (id: string, action: 'approve' | 'reject') => void;
}) {
  return (
    <div className="space-y-8">
      {/* Stats row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Agents" value={String(activeCount)} sub="ONLINE" accent />
        <StatCard label="24h Spend" value={`$${totalSpend.toFixed(2)}`} sub="ACROSS ALL SESSIONS" />
        <StatCard
          label="Pending Approvals"
          value={String(pendingCount)}
          sub={pendingCount > 0 ? 'REQUIRES REVIEW' : 'ALL CLEAR'}
          accent={pendingCount > 0}
        />
        <StatCard
          label="API Calls (24h)"
          value={String(stats?.api?.total_calls ?? 0)}
          sub={`AVG ${stats?.api?.avg_latency_ms ?? 0}ms · ${stats?.api?.error_rate ?? 0}% ERR`}
        />
      </section>

      {stats && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Transactions (24h)" value={String(stats.transactions.total)} sub={`$${stats.transactions.volume_usd} VOLUME`} />
          <StatCard
            label="Approved"
            value={String(stats.transactions.by_outcome?.approved ?? 0)}
            sub="AUTO-APPROVED"
          />
          <StatCard
            label="Held"
            value={String(stats.transactions.by_outcome?.held ?? 0)}
            sub="PENDING REVIEW"
          />
          <StatCard
            label="Total Sessions"
            value={String(stats.sessions.total)}
            sub={`${stats.sessions.active} ACTIVE`}
          />
        </section>
      )}

      {/* Sessions + Approval queue */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8">
        <div className="info-window p-0 h-[560px] flex flex-col">
          <div className="info-window-bar border-b border-border p-4 bg-muted/20 flex justify-between items-center">
            <span className="font-bold text-foreground">Registered Sessions</span>
            <span className="mono-label">{sessions.length} total</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} actionLoading={actionLoading} onSetStatus={onSetStatus} />
            ))}
            {sessions.length === 0 && (
              <div className="text-center text-muted-foreground font-mono text-xs p-10 opacity-50">
                No agent sessions found. Create one to get started.
              </div>
            )}
          </div>
        </div>

        <div className="info-window p-0 h-[560px] flex flex-col border-primary/20">
          <div className="info-window-bar border-b border-border p-4 flex justify-between bg-primary/5">
            <span className="font-bold text-primary">Authorization Queue</span>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && <div className="w-2 h-2 bg-primary animate-pulse" />}
              <span className="mono-label text-primary">
                {pendingCount > 0 ? `${pendingCount} PENDING` : 'CLEAR'}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {approvals.map((approval) => (
              <ApprovalCard key={approval.id} approval={approval} actionLoading={actionLoading} onResolve={onResolveApproval} />
            ))}
            {approvals.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <div className="w-12 h-12 border border-dashed border-muted-foreground flex items-center justify-center mb-4 text-xl">&#10003;</div>
                <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Queue is clear</div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function TransactionsTab({ transactions }: { transactions: TxEntry[] }) {
  return (
    <div className="info-window p-0">
      <div className="info-window-bar border-b border-border p-4 bg-muted/20 flex justify-between items-center">
        <span className="font-bold text-foreground">Transaction History</span>
        <span className="mono-label">{transactions.length} entries</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3 font-medium">TIME</th>
              <th className="text-left p-3 font-medium">AGENT</th>
              <th className="text-right p-3 font-medium">AMOUNT</th>
              <th className="text-left p-3 font-medium">CHAIN</th>
              <th className="text-left p-3 font-medium">OUTCOME</th>
              <th className="text-left p-3 font-medium">DESTINATION</th>
              <th className="text-left p-3 font-medium">TX HASH</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                <td className="p-3 text-muted-foreground whitespace-nowrap">
                  {new Date(tx.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="p-3 text-foreground">{tx.sessions?.agent_name ?? '—'}</td>
                <td className="p-3 text-right text-foreground font-bold">${Number(tx.amount).toFixed(2)}</td>
                <td className="p-3">
                  <span className="text-primary">{tx.chain_id}</span>
                  <span className="text-muted-foreground">/{tx.token}</span>
                </td>
                <td className="p-3">
                  <span className={`font-bold uppercase ${OUTCOME_COLORS[tx.outcome] ?? 'text-muted-foreground'}`}>
                    {tx.outcome}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">
                  {tx.destination_address.slice(0, 6)}...{tx.destination_address.slice(-4)}
                </td>
                <td className="p-3 text-muted-foreground">
                  {tx.tx_hash ? tx.tx_hash.slice(0, 10) + '...' : '—'}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground opacity-50">
                  No transactions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityTab({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="info-window p-0">
      <div className="info-window-bar border-b border-border p-4 bg-muted/20 flex justify-between items-center">
        <span className="font-bold text-foreground">Audit Trail</span>
        <span className="mono-label">{entries.length} events</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3 font-medium">TIME</th>
              <th className="text-left p-3 font-medium">ACTION</th>
              <th className="text-left p-3 font-medium">RESOURCE</th>
              <th className="text-left p-3 font-medium">OUTCOME</th>
              <th className="text-left p-3 font-medium">DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                <td className="p-3 text-muted-foreground whitespace-nowrap">
                  {new Date(entry.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="p-3">
                  <span className="text-primary font-bold">{entry.action}</span>
                </td>
                <td className="p-3 text-foreground">
                  {entry.resource_type}
                  {entry.resource_id && (
                    <span className="text-muted-foreground ml-1">
                      {entry.resource_id.slice(0, 8)}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <span className={entry.outcome === 'success' ? 'text-green-400' : entry.outcome === 'denied' ? 'text-red-400' : 'text-yellow-400'}>
                    {entry.outcome}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                  {Object.entries(entry.metadata || {}).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ') || '—'}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground opacity-50">
                  No audit events yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`info-window p-5 space-y-3 ${accent ? 'border-primary/30' : ''}`}>
      <span className={`mono-label ${accent ? 'text-primary' : ''}`}>{label}</span>
      <div className="text-2xl font-black text-foreground tabular-nums">{value}</div>
      <div className="mono-label opacity-50">{sub}</div>
    </div>
  );
}

function SessionCard({
  session, actionLoading, onSetStatus,
}: {
  session: Session;
  actionLoading: string | null;
  onSetStatus: (id: string, status: 'active' | 'paused' | 'revoked') => void;
}) {
  return (
    <div className="p-4 border border-border bg-card space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm font-bold text-foreground">{session.agent_name}</div>
          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
            {session.wallet_address.slice(0, 6)}...{session.wallet_address.slice(-4)}
          </div>
        </div>
        <span className={`px-2 py-1 text-[10px] font-bold uppercase ${STATUS_COLORS[session.status] ?? ''}`}>
          {session.status}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
          <span>Spent <span className="text-foreground">${Number(session.spend_today).toFixed(2)}</span></span>
          <span>Limit <span className="text-foreground">${session.daily_limit}</span></span>
        </div>
        <div className="w-full h-1 bg-border overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (Number(session.spend_today) / session.daily_limit) * 100)}%` }}
          />
        </div>
      </div>

      <div className="text-[10px] font-mono text-muted-foreground">
        Per-tx limit: <span className="text-foreground">${session.per_tx_limit}</span>
        {' · '}
        {session.allowed_token} on{' '}
        {(session.allowed_chains ?? [session.allowed_chain]).map((c, i) => (
          <span key={c}>
            {i > 0 && ', '}
            <span className="text-primary">{c}</span>
          </span>
        ))}
      </div>

      {session.status !== 'revoked' && (
        <div className="flex gap-2 pt-1">
          {session.status === 'active' ? (
            <button
              onClick={() => onSetStatus(session.id, 'paused')}
              disabled={actionLoading === session.id + 'paused'}
              className="sutera-btn text-[9px] px-3 py-1.5 disabled:opacity-40"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={() => onSetStatus(session.id, 'active')}
              disabled={actionLoading === session.id + 'active'}
              className="sutera-btn text-[9px] px-3 py-1.5 disabled:opacity-40"
            >
              Resume
            </button>
          )}
          <button
            onClick={() => onSetStatus(session.id, 'revoked')}
            disabled={actionLoading === session.id + 'revoked'}
            className="sutera-btn text-[9px] px-3 py-1.5 border-destructive/50 text-destructive hover:border-destructive disabled:opacity-40"
          >
            Revoke
          </button>
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  approval, actionLoading, onResolve,
}: {
  approval: Approval;
  actionLoading: string | null;
  onResolve: (id: string, action: 'approve' | 'reject') => void;
}) {
  return (
    <div className="p-5 border border-primary/30 bg-primary/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-mono text-primary font-bold uppercase bg-primary/10 px-2 py-1">
          Action Required
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {new Date(approval.created_at).toLocaleTimeString()}
        </span>
      </div>

      <div className="text-xl font-black text-foreground mb-0.5">${approval.amount} USDC</div>
      <div className="text-[10px] font-mono text-muted-foreground mb-1">
        Agent: <span className="text-foreground">{approval.sessions?.agent_name ?? '—'}</span>
      </div>
      <div className="text-[10px] font-mono text-muted-foreground mb-3">
        To: {approval.destination_address.slice(0, 6)}...{approval.destination_address.slice(-4)}
      </div>

      <div className="bg-background/80 p-3 text-[11px] font-mono text-red-400 border border-red-500/20 mb-4 flex gap-2">
        <span className="font-bold shrink-0">HOLD:</span>
        <span>{approval.reason}</span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onResolve(approval.id, 'approve')}
          disabled={actionLoading === approval.id + 'approve'}
          className="flex-1 py-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {actionLoading === approval.id + 'approve' ? '...' : 'APPROVE'}
        </button>
        <button
          onClick={() => onResolve(approval.id, 'reject')}
          disabled={actionLoading === approval.id + 'reject'}
          className="flex-1 py-2 bg-muted text-foreground text-[10px] font-bold uppercase tracking-widest border border-border hover:bg-border transition-colors disabled:opacity-40"
        >
          {actionLoading === approval.id + 'reject' ? '...' : 'REJECT'}
        </button>
      </div>
    </div>
  );
}
