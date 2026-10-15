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
    <div className="flex-1 flex flex-col min-w-0 bg-[#090a0c] text-xs overflow-hidden">
      {/* Top Header */}
      <div className="h-12 px-4 bg-[#0f1013] border-b border-[#1c1d22] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <Database className="w-4 h-4 text-zinc-400" />
          <h1 className="font-semibold text-zinc-200 uppercase text-xs tracking-tight">
            Turso SQLite Database
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="p-1.5 bg-[#14151b] hover:bg-[#1a1b22] text-zinc-400 hover:text-zinc-200 border border-[#22242b] rounded transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href="https://turso.tech"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 bg-[#181a22] hover:bg-[#20222d] text-zinc-300 rounded text-[11px] font-medium flex items-center space-x-1 border border-[#232634]"
          >
            <span>turso.tech</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#090a0c]">
        {/* Status Card */}
        <div className="bg-[#121317] border border-[#22242b] rounded-lg p-4 space-y-3 w-full max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {status.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
              <span className="font-medium text-zinc-200">
                {status.connected ? 'Turso Connected' : 'Database Offline'}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono bg-[#0c0d10] border border-[#1f2026] px-2 py-0.5 rounded">
              {status.templateCount !== undefined ? `${status.templateCount} Templates in DB` : ''}
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 font-mono bg-[#0c0d10] p-2.5 rounded border border-[#1f2026]">
            {status.message}
          </p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleTest}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-2.5 h-2.5" />
              <span>Test Connection</span>
            </button>

            <button
              onClick={handleInit}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Database className="w-2.5 h-2.5" />
              <span>Verify Schema</span>
            </button>

            <button
              onClick={handleSeed}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>Seed Initial Templates</span>
            </button>
          </div>
        </div>

        {/* Runtime Configuration Form */}
        <div className="bg-[#121317] border border-[#22242b] rounded-lg p-4 space-y-3 w-full max-w-6xl mx-auto">
          <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider block">
            Update Turso Credentials
          </span>

          <form onSubmit={handleSaveCreds} className="space-y-3">
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                TURSO_DATABASE_URL
              </label>
              <input
                type="text"
                placeholder="libsql://your-db-org.turso.io"
                value={dbUrl}
                onChange={(e) => setDbUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                TURSO_AUTH_TOKEN
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOi..."
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
              />
            </div>

            <div className="pt-1 flex items-center justify-end">
              <button
                type="submit"
                disabled={actionLoading || !dbUrl}
                className="px-3.5 py-1.5 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>Save Credentials</span>
              </button>
            </div>
          </form>
        </div>

        {/* Console logs */}
        <div className="bg-[#121317] border border-[#22242b] rounded-lg p-4 space-y-2 w-full max-w-6xl mx-auto">
          <div className="flex items-center space-x-1.5 text-zinc-400 font-mono text-[10px] uppercase">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span>Diagnostic Logs</span>
          </div>
          <div className="p-3 bg-[#0c0d10] border border-[#1f2026] rounded text-[11px] font-mono space-y-1 text-zinc-400 max-h-48 overflow-y-auto">
            {consoleLogs.map((log, i) => (
              <div key={i} className="leading-tight">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
