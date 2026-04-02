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

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-primary/20 text-primary',
  paused: 'bg-yellow-500/20 text-yellow-400',
  revoked: 'bg-destructive/20 text-destructive',
};

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const totalSpend = sessions.reduce((sum, s) => sum + Number(s.spend_today), 0);
  const activeSessionsCount = sessions.filter(s => s.status === 'active').length;
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSession = async () => {
    setActionLoading('create');
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_limit: 100, per_tx_limit: 20, agent_name: `Agent-${Date.now()}` }),
    });
    await fetchData();
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
    <div className="space-y-10 pb-20">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground mb-2">
            Agent Sessions
          </h1>
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
            Spending Controls &amp; Authorization Queue / V2.1
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

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="info-window p-6 space-y-4">
          <span className="mono-label">Active Agents</span>
          <div>
            <div className="text-3xl font-black text-foreground tabular-nums">
              {activeSessionsCount}
            </div>
            <div className="mono-label mt-1 text-primary">ONLINE</div>
          </div>
        </div>

        <div className="info-window p-6 space-y-4">
          <span className="mono-label">24h Network Spend</span>
          <div>
            <div className="text-3xl font-black text-foreground tabular-nums">
              ${totalSpend.toFixed(2)}
            </div>
            <div className="mono-label mt-1 opacity-50">USDC ON BASE</div>
          </div>
        </div>

        <div className="info-window p-6 space-y-4 border-primary/30">
          <span className="mono-label text-primary">Pending Approvals</span>
          <div>
            <div className="text-3xl font-black text-foreground tabular-nums">
              {pendingQueueCount}
            </div>
            <div className="mono-label mt-1 opacity-50">REQUIRES HUMAN REVIEW</div>
          </div>
        </div>
      </section>

      {/* Main panels */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8">

        {/* Sessions list */}
        <div className="info-window p-0 h-[560px] flex flex-col">
          <div className="info-window-bar border-b border-border p-4 bg-muted/20 flex justify-between items-center">
            <span className="font-bold text-foreground">Registered Sessions</span>
            <span className="mono-label">{sessions.length} total</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sessions.map(session => (
              <div key={session.id} className="p-4 border border-border bg-card space-y-3">
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
                  {session.allowed_token} on {session.allowed_chain}
                </div>

                {session.status !== 'revoked' && (
                  <div className="flex gap-2 pt-1">
                    {session.status === 'active' ? (
                      <button
                        onClick={() => handleSetStatus(session.id, 'paused')}
                        disabled={actionLoading === session.id + 'paused'}
                        className="sutera-btn text-[9px] px-3 py-1.5 disabled:opacity-40"
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSetStatus(session.id, 'active')}
                        disabled={actionLoading === session.id + 'active'}
                        className="sutera-btn text-[9px] px-3 py-1.5 disabled:opacity-40"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={() => handleSetStatus(session.id, 'revoked')}
                      disabled={actionLoading === session.id + 'revoked'}
                      className="sutera-btn text-[9px] px-3 py-1.5 border-destructive/50 text-destructive hover:border-destructive disabled:opacity-40"
                    >
                      Revoke
                    </button>
                  </div>
                )}
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center text-muted-foreground font-mono text-xs p-10 opacity-50">
                No agent sessions found. Create one to get started.
              </div>
            )}
          </div>
        </div>

        {/* Approval queue */}
        <div className="info-window p-0 h-[560px] flex flex-col border-primary/20">
          <div className="info-window-bar border-b border-border p-4 flex justify-between bg-primary/5">
            <span className="font-bold text-primary">Authorization Queue</span>
            <div className="flex items-center gap-2">
              {pendingQueueCount > 0 && (
                <div className="w-2 h-2 bg-primary animate-pulse" />
              )}
              <span className="mono-label text-primary">
                {pendingQueueCount > 0 ? `${pendingQueueCount} PENDING` : 'CLEAR'}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {approvals.map(approval => (
              <div key={approval.id} className="p-5 border border-primary/30 bg-primary/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono text-primary font-bold uppercase bg-primary/10 px-2 py-1">
                    Action Required
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {new Date(approval.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-xl font-black text-foreground mb-0.5">
                  ${approval.amount} USDC
                </div>
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
                    onClick={() => handleResolveApproval(approval.id, 'approve')}
                    disabled={actionLoading === approval.id + 'approve'}
                    className="flex-1 py-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {actionLoading === approval.id + 'approve' ? '...' : 'APPROVE'}
                  </button>
                  <button
                    onClick={() => handleResolveApproval(approval.id, 'reject')}
                    disabled={actionLoading === approval.id + 'reject'}
                    className="flex-1 py-2 bg-muted text-foreground text-[10px] font-bold uppercase tracking-widest border border-border hover:bg-border transition-colors disabled:opacity-40"
                  >
                    {actionLoading === approval.id + 'reject' ? '...' : 'REJECT'}
                  </button>
                </div>
              </div>
            ))}
            {approvals.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-40">
                <div className="w-12 h-12 border border-dashed border-muted-foreground flex items-center justify-center mb-4 text-xl">
                  &#10003;
                </div>
                <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                  Queue is clear
                </div>
              </div>
            )}
          </div>
        </div>

      </section>
    </div>
  );
}
