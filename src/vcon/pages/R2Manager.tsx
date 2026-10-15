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
  Copy,
  Check,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { SystemStatus } from '../../types.ts';
import { AdminTablePagination } from '../components/AdminTablePagination.tsx';

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

interface R2BucketFile {
  key: string;
  size: number;
  lastModified?: string;
  url: string;
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

  // Bucket files listing state
  const [bucketFiles, setBucketFiles] = useState<R2BucketFile[] | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [filePage, setFilePage] = useState(1);
  const [selectedFileKeys, setSelectedFileKeys] = useState<Set<string>>(() => new Set());

  // Sync state if status changes from server
  useEffect(() => {
    if (status.accountId && !accountId) setAccountId(status.accountId);
    if (status.accessKeyId && !accessKeyId) setAccessKeyId(status.accessKeyId);
    if (status.bucket && bucketName === 'html-templates') setBucketName(status.bucket);
    if (status.publicDomain !== undefined) setPublicDomain(status.publicDomain || '');
  }, [status]);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const fetchBucketFiles = async () => {
    setLoadingFiles(true);
    try {
      const token = localStorage.getItem('vcon_token') || '';
      const res = await fetch('/api/vcon/r2-files', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: any = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setBucketFiles(data.files);
        setFilePage(1);
        setSelectedFileKeys(new Set());
        addLog(`Successfully loaded ${data.files.length} file(s) from R2 bucket.`);
      } else {
        addLog(`Could not list R2 files: ${data.error || 'Check credentials'}`);
      }
    } catch (err: any) {
      addLog(`Error listing R2 files: ${err?.message}`);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleCopyUrl = (url: string, key: string) => {
    const fullUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopySelectedUrls = async () => {
    const selectedFiles = (bucketFiles || []).filter((file) => selectedFileKeys.has(file.key));
    const urls = selectedFiles.map((file) =>
      file.url.startsWith('/') ? `${window.location.origin}${file.url}` : file.url
    );

    try {
      await navigator.clipboard.writeText(urls.join('\n'));
      addLog(`Copied ${urls.length} selected file URL(s) to clipboard.`);
    } catch (err: any) {
      addLog(`Could not copy selected file URLs: ${err?.message || 'Clipboard unavailable'}`);
    }
  };

  const handleTest = async () => {
    setActionLoading(true);
    setFeedback(null);
    addLog('Testing Cloudflare R2 bucket connection and credentials...');
    try {
      const res = await onTestConnection();
      const deliveryMode = publicDomain.trim()
        ? `Custom public domain (${publicDomain.trim()})`
        : 'Built-in API endpoint fallback (/api/r2/file/...)';
      const msg = res.message || (res as any).error || (res.success ? 'Connected successfully.' : 'Connection failed.');
      addLog(msg);
      addLog(`Active file delivery mode: ${deliveryMode}`);
      if (res.success) {
        setFeedback({ type: 'success', text: `${msg} File delivery: ${deliveryMode}` });
        fetchBucketFiles();
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
        const mode = publicDomain.trim()
          ? `Custom domain: ${publicDomain.trim()}`
          : 'Built-in API endpoint fallback: /api/r2/file/...';
        const msg = res.message || 'Cloudflare R2 credentials successfully saved to database.';
        addLog(msg);
        addLog(`File delivery configured: ${mode}`);
        setFeedback({
          type: 'success',
          text: `${msg} (${mode})`,
        });
        setSecretAccessKey('');
        onRefresh();
        fetchBucketFiles();
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
        setBucketFiles(null);
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
  const filePageCount = Math.max(1, Math.ceil((bucketFiles?.length || 0) / 20));
  const currentFilePage = Math.min(filePage, filePageCount);
  const pageBucketFiles = (bucketFiles || []).slice((currentFilePage - 1) * 20, currentFilePage * 20);
  const allBucketFilesSelected = Boolean(
    bucketFiles?.length && bucketFiles.every((file) => selectedFileKeys.has(file.key))
  );

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
            onClick={() => {
              onRefresh();
              if (status.connected) fetchBucketFiles();
            }}
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

          {/* File Delivery Method Indicator */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <div className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#0c0d10] border border-[#1f2026] text-zinc-400 flex items-center space-x-1.5">
              <span className="text-zinc-500">File Delivery Mode:</span>
              {status.publicDomain ? (
                <span className="text-cyan-400 font-medium">Custom Domain ({status.publicDomain})</span>
              ) : (
                <span className="text-emerald-400 font-medium">Built-in API Proxy Fallback (/api/r2/file/...)</span>
              )}
            </div>
          </div>

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

            {status.connected && (
              <button
                onClick={fetchBucketFiles}
                disabled={loadingFiles}
                className="px-3 py-1.5 bg-[#14151b] hover:bg-[#1c1d25] text-zinc-300 border border-[#22242b] rounded text-[11px] font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <FolderOpen className="w-3 h-3 text-zinc-400" />
                <span>{loadingFiles ? 'Loading Files...' : 'Browse Bucket Files'}</span>
              </button>
            )}

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

        {/* Bucket Files Explorer */}
        {status.connected && (
          <div className="bg-[#121317] border border-[#22242b] rounded-lg p-4 space-y-3 max-w-4xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-4 h-4 text-zinc-400" />
                <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider">
                  R2 Bucket Files Explorer
                </span>
              </div>
              <button
                onClick={fetchBucketFiles}
                disabled={loadingFiles}
                className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 bg-[#0c0d10] border border-[#1f2026] px-2 py-1 rounded transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loadingFiles ? 'animate-spin' : ''}`} />
                <span>{loadingFiles ? 'Refreshing...' : 'Refresh Files'}</span>
              </button>
            </div>

            {bucketFiles === null ? (
              <div className="bg-[#0c0d10] p-4 rounded border border-[#1f2026] text-center">
                <p className="text-zinc-400 text-xs mb-2">
                  Verify files uploaded and served through Cloudflare R2.
                </p>
                <button
                  onClick={fetchBucketFiles}
                  disabled={loadingFiles}
                  className="px-3 py-1.5 bg-[#181a22] hover:bg-[#20222d] text-zinc-200 rounded text-xs border border-[#232634] transition cursor-pointer"
                >
                  {loadingFiles ? 'Loading...' : 'Load Files List'}
                </button>
              </div>
            ) : bucketFiles.length === 0 ? (
              <div className="bg-[#0c0d10] p-4 rounded border border-[#1f2026] text-center text-zinc-500 text-xs">
                No files found in bucket "{status.bucket}". Upload a template or branding asset to store files.
              </div>
            ) : (
              <div className="bg-[#0c0d10] border border-[#1f2026] rounded overflow-hidden">
                {selectedFileKeys.size > 0 && (
                  <div className="px-3 py-2 flex items-center justify-between bg-[#111216] border-b border-[#1f2026]">
                    <span className="text-[10px] text-zinc-400 font-mono">{selectedFileKeys.size} selected</span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedFileKeys(new Set())}
                        className="px-2 py-1 text-zinc-400 hover:text-zinc-200 rounded transition"
                      >
                        Clear selection
                      </button>
                      <button
                        type="button"
                        onClick={handleCopySelectedUrls}
                        className="px-2.5 py-1 bg-[#181a22] hover:bg-[#20222d] text-zinc-300 border border-[#232634] rounded text-[10px] font-medium transition flex items-center space-x-1.5"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy selected URLs</span>
                      </button>
                    </div>
                  </div>
                )}
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#14151b] border-b border-[#1f2026] text-zinc-500 uppercase text-[9px] font-mono tracking-wider sticky top-0">
                        <th className="py-2 pl-3 pr-1">
                          <input
                            type="checkbox"
                            checked={allBucketFilesSelected}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setSelectedFileKeys((previous) => {
                                const next = new Set(previous);
                                (bucketFiles || []).forEach((file) => checked ? next.add(file.key) : next.delete(file.key));
                                return next;
                              });
                            }}
                            aria-label="Select all R2 files"
                            className="accent-zinc-400"
                          />
                        </th>
                        <th className="py-2 px-3">File Key</th>
                        <th className="py-2 px-3">Size</th>
                        <th className="py-2 px-3">Access Delivery URL</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#181920]">
                      {pageBucketFiles.map((file) => (
                        <tr key={file.key} className="hover:bg-[#121318] transition-colors">
                          <td className="py-2 pl-3 pr-1">
                            <input
                              type="checkbox"
                              checked={selectedFileKeys.has(file.key)}
                              onChange={(event) => {
                                const checked = event.target.checked;
                                setSelectedFileKeys((previous) => {
                                  const next = new Set(previous);
                                  if (checked) next.add(file.key);
                                  else next.delete(file.key);
                                  return next;
                                });
                              }}
                              aria-label={`Select R2 file ${file.key}`}
                              className="accent-zinc-400"
                            />
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-zinc-200">
                            <div className="flex items-center space-x-1.5">
                              <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="truncate max-w-[220px]" title={file.key}>
                                {file.key}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px] text-zinc-400">
                            {(file.size / 1024).toFixed(1)} KB
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px] text-zinc-400 truncate max-w-[260px]" title={file.url}>
                            {file.url}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleCopyUrl(file.url, file.key)}
                                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-[#1c1d25] rounded transition cursor-pointer"
                                title="Copy public URL"
                              >
                                {copiedKey === file.key ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-zinc-400 hover:text-cyan-400 hover:bg-[#1c1d25] rounded transition inline-flex items-center"
                                title="Open / Preview in new tab"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <AdminTablePagination
                  page={currentFilePage}
                  totalRows={bucketFiles.length}
                  onPageChange={setFilePage}
                />
              </div>
            )}
          </div>
        )}

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
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-zinc-400 uppercase tracking-wider">
                  Public Domain (Optional)
                </label>
                {publicDomain.trim() ? (
                  <span className="text-[9px] text-cyan-400 font-mono bg-cyan-950/30 border border-cyan-900/40 px-1.5 py-0.5 rounded">
                    Custom Domain Active
                  </span>
                ) : (
                  <span className="text-[9px] text-emerald-400 font-mono bg-emerald-950/30 border border-emerald-900/40 px-1.5 py-0.5 rounded">
                    API Fallback Active (/api/r2/file/...)
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="e.g. https://cdn.domain.com or https://pub-xxx.r2.dev"
                value={publicDomain}
                onChange={(e) => setPublicDomain(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
              />
              <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                {publicDomain.trim()
                  ? `Files will be served directly from ${publicDomain.trim()}.`
                  : 'No public domain required. Files are automatically served using the built-in API proxy endpoint (/api/r2/file/...). If you add a custom public domain, it will be used instead.'}
              </p>
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
