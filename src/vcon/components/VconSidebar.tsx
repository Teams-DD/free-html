import React from 'react';
import {
  Layers,
  PlusCircle,
  FolderTree,
  Database,
  Cloud,
  FileCode2,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Settings,
} from 'lucide-react';

export type VconTab = 'templates' | 'categories' | 'add' | 'settings' | 'turso' | 'r2' | 'deploy';

interface Props {
  activeTab: VconTab;
  onSelectTab: (tab: VconTab) => void;
  onLogout: () => void;
  tursoConnected: boolean;
  r2Connected: boolean;
}

export const VconSidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  onLogout,
  tursoConnected,
  r2Connected,
}) => {
  return (
    <aside className="w-56 bg-[#0c0d10] border-r border-[#1c1d22] flex flex-col shrink-0 text-xs">
      {/* Admin Branding */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-[#1c1d22]">
        <div className="flex items-center space-x-2.5">
          <div className="w-5 h-5 bg-[#1a1b22] border border-[#262833] rounded flex items-center justify-center text-zinc-300 font-semibold text-[10px]">
            V
          </div>
          <span className="font-semibold tracking-tight text-zinc-200 uppercase text-[11px]">
            VCON ADMIN
          </span>
        </div>
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/90" />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        <button
          onClick={() => onSelectTab('templates')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-[#181a22] text-zinc-100 border border-[#232634]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#13141a]'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>Templates</span>
          </div>
        </button>

        <button
          onClick={() => onSelectTab('categories')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-[#181a22] text-zinc-100 border border-[#232634]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#13141a]'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <FolderTree className="w-3.5 h-3.5 text-zinc-400" />
            <span>Categories</span>
          </div>
        </button>

        <button
          onClick={() => onSelectTab('add')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'add'
              ? 'bg-[#181a22] text-zinc-100 border border-[#232634]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#13141a]'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <PlusCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span>Add / Upload</span>
          </div>
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[#181a22] text-zinc-100 border border-[#232634]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#13141a]'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span>Settings</span>
          </div>
        </button>

        <div className="pt-3 pb-1 px-2.5 text-[9px] font-medium text-zinc-500 uppercase tracking-wider font-mono">
          System Infrastructure
        </div>

        <button
          onClick={() => onSelectTab('turso')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'turso'
              ? 'bg-[#181a22] text-zinc-100 border border-[#232634]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#13141a]'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span>Turso SQLite</span>
          </div>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              tursoConnected ? 'bg-emerald-400' : 'bg-rose-500'
            }`}
          />
        </button>

        <button
          onClick={() => onSelectTab('r2')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'r2'
              ? 'bg-[#181a22] text-zinc-100 border border-[#232634]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#13141a]'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Cloud className="w-3.5 h-3.5 text-zinc-400" />
            <span>Cloudflare R2</span>
          </div>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              r2Connected ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
        </button>

        <button
          onClick={() => onSelectTab('deploy')}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'deploy'
              ? 'bg-[#181a22] text-zinc-100 border border-[#232634]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#13141a]'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <FileCode2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Deploy</span>
          </div>
        </button>
      </nav>

      {/* Footer Actions */}
      <div className="p-2.5 border-t border-[#1c1d22] space-y-1">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-[#13141a] transition"
        >
          <span className="flex items-center space-x-2">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </span>
          <span className="text-[10px] text-zinc-600 font-mono">/</span>
        </a>

        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded text-[11px] text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
