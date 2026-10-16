import React, { useState } from 'react';
import { Activity, Copy, Trash2, X } from 'lucide-react';

export interface DevLogEntry {
  time: string;
  level: 'info' | 'error';
  message: string;
  details?: Record<string, string | number | null>;
}

interface Props {
  logs: DevLogEntry[];
  onClear: () => void;
}

export const DevLogPanel: React.FC<Props> = ({ logs, onClear }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded border border-emerald-800/70 bg-[#101713] px-3 py-2 text-[11px] font-medium text-emerald-200 shadow-lg transition hover:bg-[#17231b]"
        aria-label={`Open Dev Log, ${logs.length} entries`}
      >
        <Activity className="h-3.5 w-3.5" />
        <span>Dev Log</span>
        <span className="font-mono text-emerald-400">{logs.length}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 backdrop-blur-[2px] sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="dev-log-title"
            className="flex h-[min(680px,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-md border border-zinc-800 bg-[#101114] shadow-2xl"
          >
            <header className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-800 bg-[#141519] px-3.5">
              <div className="flex items-center gap-2 text-zinc-200">
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                <h2 id="dev-log-title" className="text-xs font-semibold">Public Dev Log</h2>
                <span className="font-mono text-[10px] text-zinc-500">{logs.length} entries</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-[10px] text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                  title="Clear logs"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Clear</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={logs.length === 0}
                  className="inline-flex items-center gap-1.5 rounded border border-zinc-700 px-2 py-1.5 text-[10px] text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-40"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copied ? 'Copied' : 'Copy logs'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-1 rounded p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                  aria-label="Close Dev Log"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-auto p-2.5">
              {logs.length === 0 ? (
                <p className="flex h-full items-center justify-center text-[11px] text-zinc-500">
                  No diagnostic events captured in this page session.
                </p>
              ) : (
                <ol className="space-y-1.5">
                  {logs.map((entry, index) => (
                    <li
                      key={`${entry.time}-${index}`}
                      className="rounded border border-[#22242b] bg-[#0c0d10] p-2.5"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <time className="font-mono text-[9px] text-zinc-500">{entry.time}</time>
                        <span className={`font-mono text-[9px] uppercase ${entry.level === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {entry.level}
                        </span>
                        <span className="break-all text-[10px] text-zinc-200">{entry.message}</span>
                      </div>
                      {entry.details && (
                        <dl className="mt-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-[9px]">
                          {Object.entries(entry.details).map(([key, value]) => (
                            <React.Fragment key={key}>
                              <dt className="font-mono text-zinc-500">{key}</dt>
                              <dd className="break-all font-mono text-zinc-400">{value ?? 'unavailable'}</dd>
                            </React.Fragment>
                          ))}
                        </dl>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <footer className="shrink-0 border-t border-zinc-800 px-3.5 py-2 text-[9px] text-zinc-600">
              Local app API and top-level browser errors only. No response bodies, credentials, iframe-internal traffic, or Cloudflare account-wide analytics.
            </footer>
          </section>
        </div>
      )}
    </>
  );
};