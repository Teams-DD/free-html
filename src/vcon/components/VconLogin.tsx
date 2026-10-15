import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert, Check } from 'lucide-react';

interface Props {
  onLoginSuccess: (token: string) => void;
  onSwitchToSetup?: () => void;
}

export const VconLogin: React.FC<Props> = ({ onLoginSuccess, onSwitchToSetup }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/vcon/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data: any = await res.json();
      if (res.ok && data.success && data.token) {
        localStorage.setItem('vcon_admin_token', data.token);
        onLoginSuccess(data.token);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-zinc-800">
          <div className="w-6 h-6 bg-zinc-800 border border-zinc-700/60 rounded flex items-center justify-center text-zinc-200 font-bold text-xs">
            V
          </div>
          <div>
            <h1 className="text-xs font-bold text-zinc-100 uppercase tracking-tight">
              Admin Login
            </h1>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-rose-950/40 border border-rose-800/60 rounded text-[11px] text-rose-300 flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div>
            <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition"
              placeholder="Username"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-1.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 disabled:opacity-50 text-zinc-100 rounded text-xs font-medium transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Lock className="w-3 h-3 text-zinc-400" />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-3 h-3 ml-1 text-zinc-400" />
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500">
          {onSwitchToSetup ? (
            <button
              type="button"
              onClick={onSwitchToSetup}
              className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
            >
              No admin account? Create one
            </button>
          ) : (
            <span>Secured via Turso SQLite</span>
          )}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="text-zinc-400 hover:text-zinc-200 underline"
          >
            Public Site
          </a>
        </div>
      </div>
    </div>
  );
};
