'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setSignupSuccess(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="info-window p-8 max-w-md w-full space-y-6 text-center">
          <div className="w-12 h-12 border border-primary flex items-center justify-center mx-auto">
            <span className="text-primary text-xl">&#10003;</span>
          </div>
          <h2 className="text-lg font-bold text-foreground">Check Your Email</h2>
          <p className="text-sm text-muted-foreground font-mono">
            We sent a confirmation link to <span className="text-foreground">{email}</span>.
            Click it to activate your account, then return here to log in.
          </p>
          <button
            onClick={() => { setSignupSuccess(false); setMode('login'); }}
            className="sutera-btn w-full justify-center"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="info-window max-w-md w-full">
        <div className="info-window-bar border-b border-border p-4">
          <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
            Nexus / {mode === 'login' ? 'Authenticate' : 'Register'}
          </span>
          <div className="flex gap-1">
            <div className="w-2 h-2 border border-primary" />
            <div className="w-2 h-2 border border-border" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tighter text-foreground">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              {mode === 'login' ? 'Access your control plane' : 'Set up operator access'}
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 p-3 text-[11px] font-mono text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="mono-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                placeholder="operator@nexus.io"
              />
            </div>
            <div className="space-y-1.5">
              <label className="mono-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                placeholder="min 6 characters"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground text-[10px] font-bold font-mono uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? '...' : mode === 'login' ? 'Authenticate' : 'Create Account'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
              className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
            >
              {mode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
