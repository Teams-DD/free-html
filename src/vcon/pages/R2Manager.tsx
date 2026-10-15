import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  Terminal,
  ExternalLink,
  HardDrive,
  FileCode2,
  Layers,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Database,
  BarChart3,
  Server,
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
      addLog(res.message);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
      } else {
        setFeedback({ type: 'error', text: res.message });
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
        addLog(res.message || 'Cloudflare R2 credentials successfully saved to database.');
        setFeedback({
          type: 'success',
          text: res.message || 'Credentials verified & saved to database successfully.',
        });
        setSecretAccessKey('');
        onRefresh();
      } else {
        addLog(`Save failed: ${res.error}`);
        setFeedback({ type: 'error', text: res.error || 'Failed to save credentials' });
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
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-900 text-xs overflow-y-auto p-4 space-y-4">
      {/* Title Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <Cloud className="w-4 h-4 text-zinc-400" />
          <h2 className="font-semibold text-zinc-100 uppercase text-xs tracking-tight">
            Cloudflare R2 S3 Storage
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition cursor-pointer"
            title="Refresh status & storage report"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href="https://dash.cloudflare.com"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded text-[10px] font-medium flex items-center space-x-1"
          >
            <span>Cloudflare Dashboard</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Storage Analytics & Report Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-zinc-400" />
            <span className="font-semibold text-zinc-200 uppercase text-[11px] tracking-tight">
              Storage Usage Report
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            {status.bucket || 'No bucket'}
          </span>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="bg-zinc-900/80 border border-zinc-850 p-2.5 rounded">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-0.5">
              Total Uploads
            </span>
            <span className="text-sm font-bold text-zinc-100 font-mono">
              {stats.totalFiles} files
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-850 p-2.5 rounded">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-0.5">
              Storage Used
            </span>
            <span className="text-sm font-bold text-zinc-100 font-mono">
              {stats.totalGigabytes.toFixed(6)} GB
            </span>
            <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
              {stats.totalMegabytes > 0
                ? `${stats.totalMegabytes.toFixed(3)} MB`
                : `${stats.totalKilobytes.toFixed(1)} KB`}
            </span>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-850 p-2.5 rounded">
            <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-0.5">
              R2 Monthly Quota
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
          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden border border-zinc-850">
            <div
              className="bg-zinc-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(usagePercentage, 0.8)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 space-y-3">
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
                : 'Cloudflare R2 Storage Not Connected'}
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            {status.configured ? 'Stored in Database' : 'Unconfigured'}
          </span>
        </div>

        <p className="text-[11px] text-zinc-400 font-mono bg-zinc-900/60 p-2 rounded border border-zinc-850">
          {status.message}
        </p>

        {feedback && (
          <div
            className={`p-2 rounded text-[11px] border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <div className="flex items-center space-x-2 pt-1">
          <button
            onClick={handleTest}
            disabled={actionLoading}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/60 rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3 h-3 text-zinc-400" />
            <span>Test Connection</span>
          </button>

          {status.configured && (
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-900/60 rounded text-[11px] font-medium transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove Credentials</span>
            </button>
          )}
        </div>
      </div>

      {/* R2 Credentials Form */}
      <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-2.5">
        <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider block">
          {status.configured ? 'Update R2 Credentials' : 'Add R2 Credentials'}
        </span>

        <form onSubmit={handleSave} className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
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
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
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
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
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
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="pt-1 flex items-center justify-end">
            <button
              type="submit"
              disabled={actionLoading}
              className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-100 border border-zinc-700/60 rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              <span>{actionLoading ? 'Saving...' : status.configured ? 'Update Credentials' : 'Save Credentials'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* R2 Operations Log */}
      <div className="bg-zinc-950 border border-zinc-800 rounded p-3 space-y-1.5">
        <div className="flex items-center space-x-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-wider">
          <Terminal className="w-3 h-3 text-zinc-400" />
          <span>Diagnostic Logs</span>
        </div>
        <div className="bg-zinc-900/90 rounded p-2.5 font-mono text-[10px] text-zinc-300 space-y-1 h-28 overflow-y-auto border border-zinc-850">
          {logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
