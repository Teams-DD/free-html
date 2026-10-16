import React, { useState } from 'react';
import {
  FileCode2,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Settings,
} from 'lucide-react';

export const DeploymentDocs: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const cfDashboardSettings = [
    { label: 'Framework Preset', value: 'Vite' },
    { label: 'Build Command', value: 'npm run build' },
    { label: 'Build Output Directory', value: 'dist' },
    { label: 'Root Directory', value: '/ (default)' },
    { label: 'Compatibility Flag', value: 'nodejs_compat' },
  ];

  const envVars = `TURSO_DATABASE_URL=libsql://your-db-org.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=html-templates
ADMIN_SECRET=secure_random_admin_session_secret`;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#090a0c] text-xs overflow-hidden">
      {/* Top Header */}
      <div className="h-12 px-4 bg-[#0f1013] border-b border-[#1c1d22] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <FileCode2 className="w-4 h-4 text-zinc-400" />
          <h1 className="font-semibold text-zinc-200 uppercase text-xs tracking-tight">
            Cloudflare Pages & Functions Deployment
          </h1>
        </div>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#090a0c]">
        {/* Cloudflare Architecture Card */}
        <div className="bg-[#121317] border border-[#22242b] rounded-md p-4 space-y-3 w-full max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 text-zinc-200 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cloudflare Pages & Functions Architecture Verified</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
            <div className="p-3 bg-[#0c0d10] border border-[#1f2026] rounded-md">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">
                Static Frontend
              </span>
              <span className="text-zinc-200 font-mono font-medium block">dist/</span>
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Global Cloudflare CDN with cached assets via _routes.json
              </span>
            </div>

            <div className="p-3 bg-[#0c0d10] border border-[#1f2026] rounded-md">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">
                Serverless Edge APIs
              </span>
              <span className="text-zinc-200 font-mono font-medium block">
                functions/api/[[route]].ts
              </span>
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Auto-routed edge worker with nodejs_compat flag
              </span>
            </div>

            <div className="p-3 bg-[#0c0d10] border border-[#1f2026] rounded-md">
              <span className="text-[10px] text-zinc-500 uppercase font-mono block mb-1">
                Database & Storage
              </span>
              <span className="text-zinc-200 font-mono font-medium block">Turso + R2</span>
              <span className="text-[10px] text-zinc-400 mt-1 block">
                Direct edge SQLite queries and R2 bucket uploads
              </span>
            </div>
          </div>
        </div>

        {/* Cloudflare Dashboard Build Settings */}
        <div className="bg-[#121317] border border-[#22242b] rounded-md p-4 space-y-3 w-full max-w-7xl mx-auto">
          <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider flex items-center space-x-1.5">
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span>Cloudflare Dashboard Configuration (Git / Direct Upload)</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {cfDashboardSettings.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-[#0c0d10] border border-[#1f2026] rounded-md"
              >
                <span className="text-zinc-400 text-[10px]">{s.label}</span>
                <span className="text-zinc-200 font-mono text-[10px] font-semibold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CLI Deployment Commands */}
        <div className="bg-[#121317] border border-[#22242b] rounded-md p-4 space-y-3 w-full max-w-7xl mx-auto">
          <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            <span>Wrangler CLI Commands</span>
          </span>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-400 font-mono">1. Local Edge Emulation:</span>
                <button
                  onClick={() => copyText('npm run pages:dev', 'cmd1')}
                  className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
                >
                  {copiedKey === 'cmd1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'cmd1' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-2.5 bg-[#0c0d10] border border-[#1f2026] rounded-md font-mono text-[10px] text-zinc-300">
                npm run pages:dev
              </pre>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-zinc-400 font-mono">2. Direct Deploy to Cloudflare Pages:</span>
                <button
                  onClick={() => copyText('npm run pages:deploy', 'cmd2')}
                  className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
                >
                  {copiedKey === 'cmd2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'cmd2' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-2.5 bg-[#0c0d10] border border-[#1f2026] rounded-md font-mono text-[10px] text-zinc-300">
                npm run pages:deploy
              </pre>
            </div>
          </div>
        </div>

        {/* Environment Variables Reference */}
        <div className="bg-[#121317] border border-[#22242b] rounded-md p-4 space-y-3 w-full max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider">
              Required Cloudflare Environment Variables
            </span>
            <button
              onClick={() => copyText(envVars, 'env')}
              className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
            >
              {copiedKey === 'env' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'env' ? 'Copied' : 'Copy All'}</span>
            </button>
          </div>
          <pre className="p-3 bg-[#0c0d10] rounded-md border border-[#1f2026] font-mono text-[10px] text-zinc-300 overflow-x-auto leading-relaxed">
            {envVars}
          </pre>
          <p className="text-[10px] text-zinc-500 font-mono">
            Set under: Cloudflare Dashboard &gt; Workers & Pages &gt; Your Project &gt; Settings &gt; Environment Variables.
          </p>
        </div>
      </div>
    </div>
  );
};
