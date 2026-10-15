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
    <aside className="w-52 bg-zinc-950 border-r border-zinc-800/80 flex flex-col shrink-0 text-xs">
      {/* Admin Branding */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-zinc-800/80">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-zinc-800 border border-zinc-700/60 rounded flex items-center justify-center text-zinc-200 font-bold text-[10px]">
            V
          </div>
          <span className="font-semibold tracking-tight text-zinc-200 uppercase text-[11px]">
            VCON ADMIN
          </span>
        </div>
        <ShieldCheck className="w-3 h-3 text-emerald-500" />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <button
          onClick={() => onSelectTab('templates')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>Templates</span>
          </div>
        </button>

        <button
          onClick={() => onSelectTab('categories')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FolderTree className="w-3.5 h-3.5 text-zinc-400" />
            <span>Categories</span>
          </div>
        </button>

        <button
          onClick={() => onSelectTab('add')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'add'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span>Add / Upload</span>
          </div>
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span>Settings</span>
          </div>
        </button>

        <div className="pt-2 pb-1 px-2 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
          System
        </div>

        <button
          onClick={() => onSelectTab('turso')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'turso'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            <span>Turso SQLite</span>
          </div>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              tursoConnected ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
        </button>

        <button
          onClick={() => onSelectTab('r2')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'r2'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Cloud className="w-3.5 h-3.5 text-zinc-400" />
            <span>Cloudflare R2</span>
          </div>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              r2Connected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        </button>

        <button
          onClick={() => onSelectTab('deploy')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
            activeTab === 'deploy'
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            <FileCode2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Deploy</span>
          </div>
        </button>
      </nav>

      {/* Footer Actions */}
      <div className="p-2 border-t border-zinc-800/80 space-y-0.5">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="flex items-center justify-between px-2 py-1.5 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
        >
          <span className="flex items-center space-x-2">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </span>
          <span className="text-[10px] text-zinc-600 font-mono">/</span>
        </a>

        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-2 px-2 py-1.5 rounded text-[11px] text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
