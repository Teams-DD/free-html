import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { SystemStatus } from '../../types.ts';

interface Props {
  status: SystemStatus['turso'];
  onRefresh: () => void;
  onInitSchema: () => Promise<{ success: boolean; message: string }>;
  onSeedDb: () => Promise<{ success: boolean; message: string; seeded?: number }>;
  onTestConnection: () => Promise<{ success: boolean; message: string; count?: number }>;
  onSaveCredentials: (creds: { url: string; token: string }) => Promise<boolean>;
}

export const TursoManager: React.FC<Props> = ({
  status,
  onRefresh,
  onInitSchema,
  onSeedDb,
  onTestConnection,
  onSaveCredentials,
}) => {
  const [dbUrl, setDbUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    `Turso status: ${status.connected ? 'Connected' : 'Offline'}. Templates: ${status.templateCount || 0}.`,
  ]);

  const addLog = (msg: string) => {
    setConsoleLogs((prev) => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleTest = async () => {
    setActionLoading(true);
    addLog('Testing Turso SQLite connection...');
    try {
      const res = await onTestConnection();
      addLog(res.message);
    } catch (err: any) {
      addLog(`Error: ${err?.message || 'Failed to query Turso'}`);
    } finally {
      setActionLoading(false);
      onRefresh();
    }
  };

  const handleInit = async () => {
    setActionLoading(true);
    addLog('Initializing database tables (templates, categories, admins, settings)...');
    try {
      const res = await onInitSchema();
      addLog(res.message);
    } catch (err: any) {
      addLog(`Schema error: ${err?.message}`);
    } finally {
      setActionLoading(false);
      onRefresh();
    }
  };

  const handleSeed = async () => {
    setActionLoading(true);
    addLog('Seeding initial templates into Turso SQLite...');
    try {
      const res = await onSeedDb();
      addLog(res.message);
    } catch (err: any) {
      addLog(`Seed error: ${err?.message}`);
    } finally {
      setActionLoading(false);
      onRefresh();
    }
  };

  const handleSaveCreds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUrl) return;
    setActionLoading(true);
    addLog('Updating Turso runtime configuration...');
    try {
      const ok = await onSaveCredentials({ url: dbUrl.trim(), token: authToken.trim() });
      if (ok) {
        addLog('Credentials saved.');
        setAuthToken('');
      } else {
        addLog('Failed to save credentials.');
      }
    } catch (err: any) {
      addLog(`Error: ${err?.message}`);
    } finally {
      setActionLoading(false);
      onRefresh();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-900 text-xs overflow-y-auto p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-zinc-400" />
          <h2 className="font-semibold text-zinc-100 uppercase text-xs tracking-tight">
            Turso SQLite Database
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href="https://turso.tech"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded text-[10px] font-medium flex items-center space-x-1"
          >
            <span>turso.tech</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {status.connected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="font-medium text-zinc-200">
              {status.connected ? 'Turso Connected' : 'Database Offline'}
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            {status.templateCount !== undefined ? `${status.templateCount} Templates in DB` : ''}
          </span>
        </div>

        <p className="text-[11px] text-zinc-400 font-mono bg-zinc-900/60 p-2 rounded border border-zinc-850">
          {status.message}
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-0.5">
          <button
            onClick={handleTest}
            disabled={actionLoading}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/60 rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-2.5 h-2.5" />
            <span>Test Connection</span>
          </button>

          <button
            onClick={handleInit}
            disabled={actionLoading}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/60 rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Database className="w-2.5 h-2.5" />
            <span>Verify Schema</span>
          </button>

          <button
            onClick={handleSeed}
            disabled={actionLoading}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60 rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>Seed Initial Templates</span>
          </button>
        </div>
      </div>

      {/* Runtime Configuration Form */}
      <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-2.5">
        <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider block">
          Update Turso Credentials
        </span>

        <form onSubmit={handleSaveCreds} className="space-y-2">
          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">
              TURSO_DATABASE_URL
            </label>
            <input
              type="text"
              placeholder="libsql://your-db-org.turso.io"
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">
              TURSO_AUTH_TOKEN
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOi..."
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="pt-1 flex items-center justify-end">
            <button
              type="submit"
              disabled={actionLoading || !dbUrl}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/60 disabled:opacity-40 text-zinc-200 rounded text-[11px] font-medium transition cursor-pointer"
            >
              Update Credentials
            </button>
          </div>
        </form>
      </div>

      {/* Logs */}
      <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-1.5">
        <div className="flex items-center space-x-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-wider">
          <Terminal className="w-3 h-3" />
          <span>Execution Log</span>
        </div>
        <div className="bg-zinc-900/90 rounded p-2 font-mono text-[10px] text-zinc-300 space-y-1 h-28 overflow-y-auto border border-zinc-850">
          {consoleLogs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
