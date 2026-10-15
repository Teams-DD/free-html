import React, { useState } from 'react';
import {
  ShieldAlert,
  UserPlus,
  ArrowRight,
  Database,
  ExternalLink,
  Lock,
  User,
  Key,
} from 'lucide-react';

interface Props {
  dbConfigured: boolean;
  onSuccess: (token: string) => void;
  onSwitchToLogin?: () => void;
}

export const VconSetupAdmin: React.FC<Props> = ({
  dbConfigured,
  onSuccess,
  onSwitchToLogin,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Turso credentials if database was not pre-configured in environment
  const [tursoUrl, setTursoUrl] = useState('');
  const [tursoToken, setTursoToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!dbConfigured && !tursoUrl.trim()) {
      setError('Turso database URL is required to store the admin user securely');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/vcon/register-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          tursoUrl: tursoUrl.trim() || undefined,
          tursoToken: tursoToken.trim() || undefined,
        }),
      });

      const data: any = await res.json();
      if (res.ok && data.success && data.token) {
        localStorage.setItem('vcon_admin_token', data.token);
        onSuccess(data.token);
      } else {
        setError(data.error || 'Failed to create admin user');
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
              Create Admin Account
            </h1>
          </div>
        </div>

        {error && (
          <div className="mb-3.5 p-2 bg-rose-950/40 border border-rose-800/60 rounded text-[11px] text-rose-300 flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Turso Setup Fields if unconfigured */}
          {!dbConfigured && (
            <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded space-y-2 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-300 uppercase flex items-center space-x-1">
                  <Database className="w-3 h-3 text-zinc-400" />
                  <span>Turso Database Setup</span>
                </span>
                <a
                  href="https://turso.tech"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-zinc-400 hover:text-zinc-300 flex items-center space-x-0.5"
                >
                  <span>turso.tech</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
                  TURSO_DATABASE_URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="libsql://your-db-org.turso.io"
                  value={tursoUrl}
                  onChange={(e) => setTursoUrl(e.target.value)}
                  className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">
                  TURSO_AUTH_TOKEN
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOi..."
                  value={tursoToken}
                  onChange={(e) => setTursoToken(e.target.value)}
                  className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Admin Username
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition"
                placeholder="e.g. admin"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Key className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition"
                placeholder="Repeat password"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 disabled:opacity-50 text-zinc-100 rounded text-xs font-medium transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <UserPlus className="w-3 h-3 text-zinc-400" />
              <span>{loading ? 'Registering...' : 'Create Admin'}</span>
              <ArrowRight className="w-3 h-3 ml-1 text-zinc-400" />
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500">
          {onSwitchToLogin && (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
            >
              Already have an account? Sign in
            </button>
          )}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="text-zinc-400 hover:text-zinc-200 underline ml-auto"
          >
            Public Site
          </a>
        </div>
      </div>
    </div>
  );
};
