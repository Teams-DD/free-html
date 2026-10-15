import React, { useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  Eye,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { HtmlTemplate } from '../../types.ts';

interface Props {
  templates: HtmlTemplate[];
  loading: boolean;
  onRefresh: () => void;
  onAddNew: () => void;
  onEdit: (template: HtmlTemplate) => void;
  onDelete: (id: string) => void;
  onPreview: (template: HtmlTemplate) => void;
  tursoConnected: boolean;
  onSeedDb: () => void;
}

export const TemplateManager: React.FC<Props> = ({
  templates,
  loading,
  onRefresh,
  onAddNew,
  onEdit,
  onDelete,
  onPreview,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', ...Array.from(new Set(templates.map((t) => t.category)))];

  const filtered = templates.filter((t) => {
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-900 text-xs overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-10 px-3.5 flex items-center justify-between shrink-0 bg-zinc-950">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-zinc-300 uppercase text-[11px] tracking-tight">
            Templates
          </span>
          <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-2 py-0.5 rounded">
            {templates.length}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 rounded transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onAddNew}
            className="px-2.5 py-1.5 bg-zinc-800/90 hover:bg-zinc-800 text-zinc-300 rounded text-xs font-medium transition flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="px-3.5 py-2 flex items-center space-x-2.5 bg-zinc-900/80 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 bg-zinc-950 rounded text-xs text-zinc-300 placeholder-zinc-500 focus:outline-none focus:bg-zinc-950/80"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto text-[11px]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-zinc-850 text-zinc-200'
                  : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-950/60'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-zinc-500 font-mono text-xs">
            <Layers className="w-6 h-6 text-zinc-700 mb-1" />
            <span>No templates found</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-950/80 text-zinc-400 uppercase text-[9px] font-mono tracking-wider sticky top-0 z-10">
                <th className="py-2.5 px-3.5">Title & Slug</th>
                <th className="py-2.5 px-3.5">Category</th>
                <th className="py-2.5 px-3.5">Size</th>
                <th className="py-2.5 px-3.5">Downloads</th>
                <th className="py-2.5 px-3.5">Storage</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-850/30 transition">
                  <td className="py-2 px-3.5">
                    <span className="font-medium text-zinc-300 block text-[11px]">{item.title}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">/{item.slug}</span>
                  </td>
                  <td className="py-2 px-3.5 text-zinc-400 text-[11px]">{item.category}</td>
                  <td className="py-2 px-3.5 text-zinc-500 font-mono text-[10px]">
                    {(item.file_size / 1024).toFixed(1)} KB
                  </td>
                  <td className="py-2 px-3.5 text-zinc-400 font-mono text-[11px]">{item.downloads}</td>
                  <td className="py-2 px-3.5">
                    {item.r2_key ? (
                      <span className="text-[10px] text-emerald-400/80 font-mono">R2 Synced</span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-mono">Turso</span>
                    )}
                  </td>
                  <td className="py-2 px-3.5 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => onPreview(item)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition cursor-pointer"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
