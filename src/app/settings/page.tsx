'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type WebhookEntry = {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  description: string | null;
  created_at: string;
};

const SETTINGS_TABS = ['API Keys', 'Webhooks'] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>('API Keys');
  const [loaded, setLoaded] = useState(false);

  // API Keys state
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [whUrl, setWhUrl] = useState('');
  const [whDesc, setWhDesc] = useState('');
  const [whEvents, setWhEvents] = useState<string[]>(['*']);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [whLoading, setWhLoading] = useState(false);

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/auth/api-keys');
    if (res.status === 401) { router.push('/login'); return; }
    const data = await res.json();
    if (Array.isArray(data)) setKeys(data);
    setLoaded(true);
  }, [router]);

  const fetchWebhooks = useCallback(async () => {
    const res = await fetch('/api/webhooks');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) setWebhooks(data);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
    fetchWebhooks();
  }, [fetchKeys, fetchWebhooks]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyLoading(true);
    setCreatedKey(null);
    const res = await fetch('/api/auth/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName || 'Default Key' }),
    });
    const data = await res.json();
    if (data.raw_key) {
      setCreatedKey(data.raw_key);
      setNewKeyName('');
      await fetchKeys();
    }
    setKeyLoading(false);
  };

  const handleRevokeKey = async (id: string) => {
    await fetch(`/api/auth/api-keys/${id}`, { method: 'DELETE' });
    await fetchKeys();
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhLoading(true);
    setCreatedSecret(null);
    const res = await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: whUrl, events: whEvents, description: whDesc || undefined }),
    });
    const data = await res.json();
    if (data.secret) {
      setCreatedSecret(data.secret);
      setWhUrl('');
      setWhDesc('');
      setWhEvents(['*']);
      await fetchWebhooks();
    }
    setWhLoading(false);
  };

  const handleToggleWebhook = async (id: string, enabled: boolean) => {
    await fetch(`/api/webhooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    await fetchWebhooks();
  };

  const handleDeleteWebhook = async (id: string) => {
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
    await fetchWebhooks();
  };

  const toggleEvent = (event: string) => {
    if (event === '*') {
      setWhEvents(['*']);
      return;
    }
    const without = whEvents.filter((e) => e !== '*' && e !== event);
    if (whEvents.includes(event)) {
      setWhEvents(without.length === 0 ? ['*'] : without);
    } else {
      setWhEvents([...without, event]);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="mono-label">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground mb-2">
            Settings
          </h1>
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
            API Keys · Webhooks · Developer Configuration
          </p>
        </div>
        <button onClick={() => router.push('/')} className="sutera-btn text-[9px]">
          Back to Dashboard
        </button>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 border-b border-border">
        {SETTINGS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors
              ${tab === t ? 'text-primary border-b-2 border-primary -mb-px' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t}
            {t === 'API Keys' && (
              <span className="ml-2 text-muted-foreground">{keys.filter((k) => !k.revoked_at).length}</span>
            )}
            {t === 'Webhooks' && (
              <span className="ml-2 text-muted-foreground">{webhooks.length}</span>
            )}
          </button>
        ))}
      </nav>

      {tab === 'API Keys' && (
        <div className="space-y-8">
          {/* Create key form */}
          <section className="info-window p-6 space-y-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Create API Key
            </h2>
            <p className="text-[11px] font-mono text-muted-foreground">
              API keys authenticate programmatic agent access. The raw key is shown once — store it securely.
            </p>
            <form onSubmit={handleCreateKey} className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <label className="mono-label">Key Name</label>
                <input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Agent"
                  className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>
              <button type="submit" disabled={keyLoading} className="sutera-btn disabled:opacity-40">
                {keyLoading ? '...' : 'Generate Key'}
              </button>
            </form>

            {createdKey && (
              <div className="bg-primary/5 border border-primary/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="mono-label text-primary">New API Key Created</span>
                  <span className="text-[9px] font-mono text-destructive uppercase">Copy now — shown once</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background border border-border px-3 py-2 text-xs font-mono text-foreground break-all select-all">
                    {createdKey}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(createdKey)}
                    className="sutera-btn text-[9px] px-3 py-2 shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Active keys */}
          <section className="info-window p-0">
            <div className="info-window-bar border-b border-border p-4 bg-muted/20 flex justify-between">
              <span className="font-bold text-foreground">Active Keys</span>
              <span className="mono-label">{keys.filter((k) => !k.revoked_at).length} active</span>
            </div>
            <div className="p-4 space-y-3">
              {keys
                .filter((k) => !k.revoked_at)
                .map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-4 border border-border bg-card">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-foreground">{key.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {key.key_prefix}{'*'.repeat(8)}
                        {' · '}
                        Created {new Date(key.created_at).toLocaleDateString()}
                        {key.last_used_at && (
                          <> · Last used {new Date(key.last_used_at).toLocaleDateString()}</>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeKey(key.id)}
                      className="sutera-btn text-[9px] px-3 py-1.5 border-destructive/50 text-destructive hover:border-destructive"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              {keys.filter((k) => !k.revoked_at).length === 0 && (
                <div className="text-center text-muted-foreground font-mono text-xs p-10 opacity-50">
                  No active API keys. Create one to enable programmatic access.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === 'Webhooks' && (
        <div className="space-y-8">
          {/* Create webhook form */}
          <section className="info-window p-6 space-y-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Register Webhook
            </h2>
            <p className="text-[11px] font-mono text-muted-foreground">
              Receive real-time event notifications via HTTPS POST. All payloads are signed with HMAC-SHA256.
            </p>
            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 space-y-1">
                  <label className="mono-label">Endpoint URL</label>
                  <input
                    value={whUrl}
                    onChange={(e) => setWhUrl(e.target.value)}
                    placeholder="https://your-app.com/webhooks/nexus"
                    className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div className="w-48 space-y-1">
                  <label className="mono-label">Description</label>
                  <input
                    value={whDesc}
                    onChange={(e) => setWhDesc(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="mono-label">Events</label>
                <div className="flex flex-wrap gap-2">
                  {['*', 'transaction.approved', 'transaction.held', 'approval.resolved', 'session.created', 'session.updated', 'session.revoked'].map(
                    (evt) => (
                      <button
                        key={evt}
                        type="button"
                        onClick={() => toggleEvent(evt)}
                        className={`px-3 py-1.5 text-[10px] font-mono border transition-colors ${
                          whEvents.includes(evt) || (evt !== '*' && whEvents.includes('*'))
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-foreground'
                        }`}
                      >
                        {evt === '*' ? 'All Events' : evt}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <button type="submit" disabled={whLoading || !whUrl} className="sutera-btn disabled:opacity-40">
                {whLoading ? '...' : 'Register Webhook'}
              </button>
            </form>

            {createdSecret && (
              <div className="bg-primary/5 border border-primary/30 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="mono-label text-primary">Webhook Signing Secret</span>
                  <span className="text-[9px] font-mono text-destructive uppercase">Copy now — shown once</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background border border-border px-3 py-2 text-xs font-mono text-foreground break-all select-all">
                    {createdSecret}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(createdSecret)}
                    className="sutera-btn text-[9px] px-3 py-2 shrink-0"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Verify payloads by computing HMAC-SHA256(secret, body) and comparing with the X-Nexus-Signature header.
                </p>
              </div>
            )}
          </section>

          {/* Active webhooks */}
          <section className="info-window p-0">
            <div className="info-window-bar border-b border-border p-4 bg-muted/20 flex justify-between">
              <span className="font-bold text-foreground">Registered Webhooks</span>
              <span className="mono-label">{webhooks.length} total</span>
            </div>
            <div className="p-4 space-y-3">
              {webhooks.map((wh) => (
                <div key={wh.id} className="p-4 border border-border bg-card space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="text-sm font-bold text-foreground truncate">{wh.url}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {wh.description && <>{wh.description} · </>}
                        Created {new Date(wh.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 ml-3 px-2 py-1 text-[10px] font-bold uppercase ${
                        wh.enabled ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {wh.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {wh.events.map((evt) => (
                      <span key={evt} className="px-2 py-0.5 text-[9px] font-mono border border-border text-muted-foreground">
                        {evt === '*' ? 'all events' : evt}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleToggleWebhook(wh.id, !wh.enabled)}
                      className="sutera-btn text-[9px] px-3 py-1.5"
                    >
                      {wh.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(wh.id)}
                      className="sutera-btn text-[9px] px-3 py-1.5 border-destructive/50 text-destructive hover:border-destructive"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {webhooks.length === 0 && (
                <div className="text-center text-muted-foreground font-mono text-xs p-10 opacity-50">
                  No webhooks registered. Create one to receive real-time event notifications.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
