import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  Terminal,
  ExternalLink,
  Trash2,
  Save,
  Eye,
  EyeOff,
  BarChart3,
} from 'lucide-react';
import { SystemStatus } from '../../types.ts';

interface Props {
  status: SystemStatus['r2'];
  onRefresh: () => void;
  onTestConnection: () => Promise<{ success: boolean; message: string }>;
  onSaveR2Config: (config: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicDomain?: string;
  }) => Promise<{ success: boolean; message?: string; error?: string }>;
  onDeleteR2Config: () => Promise<boolean>;
}

export const R2Manager: React.FC<Props> = ({
  status,
  onRefresh,
  onTestConnection,
  onSaveR2Config,
  onDeleteR2Config,
}) => {
  const [accountId, setAccountId] = useState(status.accountId || '');
  const [accessKeyId, setAccessKeyId] = useState(status.accessKeyId || '');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [bucketName, setBucketName] = useState(status.bucket || 'html-templates');
  const [publicDomain, setPublicDomain] = useState(status.publicDomain || '');

  const [showSecret, setShowSecret] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [logs, setLogs] = useState<string[]>([
    `Cloudflare R2 configured: ${status.configured}. Status: ${status.connected ? 'Connected' : 'Offline'}.`,
    status.message,
  ]);

  // Sync state if status changes from server
  useEffect(() => {
    if (status.accountId && !accountId) setAccountId(status.accountId);
    if (status.accessKeyId && !accessKeyId) setAccessKeyId(status.accessKeyId);
    if (status.bucket && bucketName === 'html-templates') setBucketName(status.bucket);
    if (status.publicDomain && !publicDomain) setPublicDomain(status.publicDomain);
  }, [status]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleTest = async () => {
    setActionLoading(true);
    setFeedback(null);
    addLog('Testing Cloudflare R2 bucket connection and credentials...');
    try {
      const res = await onTestConnection();
      const msg = res.message || (res as any).error || (res.success ? 'Connected successfully.' : 'Connection failed.');
      addLog(msg);
      if (res.success) {
        setFeedback({ type: 'success', text: msg });
      } else {
        setFeedback({ type: 'error', text: msg });
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to query Cloudflare R2';
      addLog(`Error: ${msg}`);
      setFeedback({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
      onRefresh();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!accountId.trim() || !accessKeyId.trim() || !secretAccessKey.trim() || !bucketName.trim()) {
      setFeedback({
        type: 'error',
        text: 'Account ID, Access Key ID, Secret Access Key, and Bucket Name are all required.',
      });
      return;
    }

    setActionLoading(true);
    addLog('Verifying and saving Cloudflare R2 credentials to database...');

    try {
      const res = await onSaveR2Config({
        accountId: accountId.trim(),
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        bucketName: bucketName.trim(),
        publicDomain: publicDomain.trim() || undefined,
      });

      if (res.success) {
        const msg = res.message || 'Cloudflare R2 credentials successfully saved to database.';
        addLog(msg);
        setFeedback({
          type: 'success',
          text: msg,
        });
        setSecretAccessKey('');
        onRefresh();
      } else {
        const errText = res.error || res.message || 'Failed to save credentials';
        addLog(`Save failed: ${errText}`);
        setFeedback({ type: 'error', text: errText });
      }
    } catch (err: any) {
      const msg = err?.message || 'Save error';
      addLog(`Error: ${msg}`);
      setFeedback({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove the R2 configuration from the database?')) {
      return;
    }

    setActionLoading(true);
    addLog('Removing R2 configuration from database...');
    try {
      const ok = await onDeleteR2Config();
      if (ok) {
        setAccountId('');
        setAccessKeyId('');
        setSecretAccessKey('');
        setPublicDomain('');
        addLog('R2 configuration removed successfully.');
        setFeedback({ type: 'success', text: 'R2 configuration removed from database.' });
        onRefresh();
      }
    } catch (err: any) {
      addLog(`Delete error: ${err?.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Storage Stats calculation
  const stats = status.stats || {
    totalFiles: 0,
    totalBytes: 0,
    totalKilobytes: 0,
    totalMegabytes: 0,
    totalGigabytes: 0,
    formattedSize: '0 B',
  };

  // 10 GB is Cloudflare R2 Free Tier monthly allowance
  const freeTierGB = 10;
  const usagePercentage = Math.min((stats.totalGigabytes / freeTierGB) * 100, 100);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#090a0c] text-xs overflow-hidden">
      {/* Top Header */}
      <div className="h-12 px-4 bg-[#0f1013] border-b border-[#1c1d22] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <Cloud className="w-4 h-4 text-zinc-400" />
          <h1 className="font-semibold text-zinc-200 uppercase text-xs tracking-tight">
            Cloudflare R2 S3 Storage
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="p-1.5 bg-[#14151b] hover:bg-[#1a1b22] text-zinc-400 hover:text-zinc-200 border border-[#22242b] rounded transition cursor-pointer"
            title="Refresh status & storage report"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href="https://dash.cloudflare.com"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 bg-[#181a22] hover:bg-[#20222d] text-zinc-300 rounded text-[11px] font-medium flex items-center space-x-1 border border-[#232634]"
          >
            <span>Cloudflare Dashboard</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#090a0c]">
        {/* Storage Analytics & Report Card */}
        <div className="bg-[#121317] border border-[#22242b] rounded-lg p-4 space-y-3 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-zinc-400" />
              <span className="font-semibold text-zinc-200 uppercase text-[11px] tracking-tight">
                Storage Usage Report
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono bg-[#0c0d10] border border-[#1f2026] px-2 py-0.5 rounded">
              {status.bucket || 'No bucket'}
            </span>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-[#0c0d10] border border-[#1f2026] p-3 rounded-md">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">
                Total Uploads
              </span>
              <span className="text-sm font-bold text-zinc-200 font-mono">
                {stats.totalFiles} files
              </span>
            </div>

            <div className="bg-[#0c0d10] border border-[#1f2026] p-3 rounded-md">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">
                Storage Used
              </span>
              <span className="text-sm font-bold text-zinc-200 font-mono">
                {stats.totalGigabytes.toFixed(6)} GB
              </span>
              <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                {stats.totalMegabytes > 0
                  ? `${stats.totalMegabytes.toFixed(3)} MB`
                  : `${stats.totalKilobytes.toFixed(1)} KB`}
              </span>
            </div>

            <div className="bg-[#0c0d10] border border-[#1f2026] p-3 rounded-md">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">
                R2 Monthly Free Quota
              </span>
              <span className="text-sm font-bold text-zinc-200 font-mono">
                10.0 GB
              </span>
              <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                {usagePercentage.toFixed(4)}% used
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mb-1">
              <span>Utilization ({stats.formattedSize})</span>
              <span>{stats.totalGigabytes.toFixed(6)} / 10 GB</span>
            </div>
            <div className="w-full bg-[#0c0d10] h-1.5 rounded-full overflow-hidden border border-[#1f2026]">
              <div
                className="bg-zinc-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(usagePercentage, 0.8)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Connection Status Card */}
        <div className="bg-[#121317] border border-[#22242b] rounded-lg p-4 space-y-3 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {status.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-amber-400" />
              )}
              <span className="font-medium text-zinc-200">
                {status.connected
                  ? `Connected to Bucket "${status.bucket}"`
                  : 'Cloudflare R2 Storage Offline'}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono bg-[#0c0d10] border border-[#1f2026] px-2 py-0.5 rounded">
              {status.configured ? 'Stored in Database' : 'Unconfigured'}
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 font-mono bg-[#0c0d10] p-2.5 rounded border border-[#1f2026]">
            {status.message}
          </p>

          {feedback && (
            <div
              className={`p-2.5 rounded text-[11px] border ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-900/40 text-rose-300'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={handleTest}
              disabled={actionLoading}
              className="px-3 py-1.5 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3 h-3 text-zinc-400" />
              <span>Test Connection</span>
            </button>

            {status.configured && (
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-[#14151b] hover:bg-rose-950/30 text-zinc-400 hover:text-rose-400 border border-[#22242b] hover:border-rose-900/50 rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove Credentials</span>
              </button>
            )}
          </div>
        </div>

        {/* R2 Credentials Form */}
        <div className="bg-[#121317] border border-[#22242b] rounded-lg p-4 space-y-3 max-w-4xl">
          <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider block">
            {status.configured ? 'Update R2 Credentials' : 'Add R2 Credentials'}
          </span>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  Cloudflare Account ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Account ID"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  R2 Bucket Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Bucket name"
                  value={bucketName}
                  onChange={(e) => setBucketName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  Access Key ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="Access Key ID"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-zinc-400 uppercase tracking-wider">
                    Secret Access Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center space-x-1 cursor-pointer"
                  >
                    {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showSecret ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showSecret ? 'text' : 'password'}
                  required
                  placeholder={status.configured ? 'Enter new key to update' : '••••••••••••••••••••••••'}
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                Public Domain (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. https://cdn.domain.com"
                value={publicDomain}
                onChange={(e) => setPublicDomain(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
              />
            </div>

            <div className="pt-1 flex items-center justify-end">
              <button
                type="submit"
                disabled={actionLoading}
                className="px-3.5 py-1.5 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
                <span>{actionLoading ? 'Saving...' : status.configured ? 'Update Credentials' : 'Save Credentials'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* R2 Operations Log */}
        <div className="bg-[#121317] border border-[#22242b] rounded-lg p-4 space-y-2 max-w-4xl">
          <div className="flex items-center space-x-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5 text-zinc-500" />
            <span>Diagnostic Logs</span>
          </div>
          <div className="bg-[#0c0d10] rounded-md p-3 font-mono text-[11px] text-zinc-300 space-y-1 h-32 overflow-y-auto border border-[#1f2026]">
            {logs.map((log, idx) => (
              <div key={idx} className="leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
