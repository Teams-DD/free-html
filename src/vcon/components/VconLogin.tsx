import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';

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
    <div className="min-h-screen w-full bg-[#090a0c] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#121317] border border-[#22242b] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0f1013] border-b border-[#1c1d22] flex items-center space-x-2.5">
          <div className="w-6 h-6 bg-[#1a1b22] border border-[#262833] rounded flex items-center justify-center text-zinc-300 font-bold text-xs">
            V
          </div>
          <div>
            <h1 className="text-xs font-semibold text-zinc-200 uppercase tracking-tight">
              Admin Login
            </h1>
          </div>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-3.5 p-2.5 bg-rose-950/40 border border-rose-900/50 rounded text-[11px] text-rose-300 flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-mono text-zinc-400 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47] transition"
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
                className="w-full px-3 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47] transition"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-[#22242c] hover:bg-[#2b2d38] border border-[#2e313c] disabled:opacity-50 text-zinc-200 rounded text-xs font-medium transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Lock className="w-3 h-3 text-zinc-400" />
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-3 h-3 ml-1 text-zinc-400" />
              </button>
            </div>
          </form>

          <div className="mt-4 pt-3 border-t border-[#1c1d22] flex items-center justify-between text-[10px] text-zinc-500">
            {onSwitchToSetup ? (
              <button
                type="button"
                onClick={onSwitchToSetup}
                className="text-zinc-400 hover:text-zinc-300 underline cursor-pointer"
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
              className="text-zinc-400 hover:text-zinc-300 underline"
            >
              Public Site
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
