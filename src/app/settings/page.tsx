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

export default function SettingsPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchKeys = useCallback(async () => {
    const res = await fetch('/api/auth/api-keys');
    if (res.status === 401) {
      router.push('/login');
      return;
    }
    const data = await res.json();
    if (Array.isArray(data)) setKeys(data);
    setLoaded(true);
  }, [router]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
    setLoading(false);
  };

  const handleRevoke = async (id: string) => {
    await fetch(`/api/auth/api-keys/${id}`, { method: 'DELETE' });
    await fetchKeys();
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
    <div className="space-y-10 pb-20">
      <header className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-foreground mb-2">
            Settings
          </h1>
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">
            API Keys &amp; Access Management
          </p>
        </div>
        <button onClick={() => router.push('/')} className="sutera-btn text-[9px]">
          Back to Dashboard
        </button>
      </header>

      {/* Create new key */}
      <section className="info-window p-6 space-y-4">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Create API Key
        </h2>
        <p className="text-[11px] font-mono text-muted-foreground">
          API keys authenticate programmatic agent access to the Nexus API.
          The raw key is shown once — store it securely.
        </p>
        <form onSubmit={handleCreate} className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="mono-label">Key Name</label>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Production Agent"
              className="w-full bg-background border border-border px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <button type="submit" disabled={loading} className="sutera-btn disabled:opacity-40">
            {loading ? '...' : 'Generate Key'}
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

      {/* Existing keys */}
      <section className="info-window p-0">
        <div className="info-window-bar border-b border-border p-4 bg-muted/20">
          <span className="font-bold text-foreground">Active Keys</span>
          <span className="mono-label">{keys.filter(k => !k.revoked_at).length} active</span>
        </div>
        <div className="p-4 space-y-3">
          {keys.filter(k => !k.revoked_at).map((key) => (
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
                onClick={() => handleRevoke(key.id)}
                className="sutera-btn text-[9px] px-3 py-1.5 border-destructive/50 text-destructive hover:border-destructive"
              >
                Revoke
              </button>
            </div>
          ))}
          {keys.filter(k => !k.revoked_at).length === 0 && (
            <div className="text-center text-muted-foreground font-mono text-xs p-10 opacity-50">
              No active API keys. Create one to enable programmatic access.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
