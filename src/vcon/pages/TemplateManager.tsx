import React, { useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  Eye,
  RefreshCw,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { HtmlTemplate } from '../../types.ts';
import { AdminTablePagination } from '../components/AdminTablePagination.tsx';

interface Props {
  templates: HtmlTemplate[];
  loading: boolean;
  onRefresh: () => void;
  onAddNew: () => void;
  onEdit: (template: HtmlTemplate) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
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
  onBulkDelete,
  onPreview,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const allFilteredSelected = filtered.length > 0 && filtered.every((item) => selectedIds.has(item.id));

  const handleBulkDelete = async () => {
    const ids = filtered.filter((item) => selectedIds.has(item.id)).map((item) => item.id);
    if (ids.length === 0 || !window.confirm(`Delete ${ids.length} selected template(s) permanently?`)) return;

    setBulkDeleting(true);
    try {
      await onBulkDelete(ids);
      setSelectedIds(new Set());
      setPage(1);
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#090a0c] text-xs overflow-hidden">
      {/* Top Header */}
      <div className="h-12 px-4 flex items-center justify-between shrink-0 bg-[#0f1013] border-b border-[#1c1d22]">
        <div className="flex items-center space-x-2.5">
          <Layers className="w-4 h-4 text-zinc-400" />
          <h1 className="font-semibold text-zinc-200 uppercase text-xs tracking-tight">
            Templates
          </h1>
          <span className="text-[10px] text-zinc-400 font-mono bg-[#14151b] border border-[#22242b] px-2 py-0.5 rounded">
            {templates.length}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 bg-[#14151b] hover:bg-[#1a1b22] text-zinc-400 hover:text-zinc-200 border border-[#22242b] rounded transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onAddNew}
            className="px-2.5 py-1.5 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-400" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="px-4 py-2.5 flex items-center space-x-2.5 bg-[#0c0d10] border-b border-[#1c1d22] shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIds(new Set());
              setPage(1);
            }}
            className="w-full pl-8 pr-2.5 py-1 bg-[#090a0c] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#383b47]"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto text-[11px]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedIds(new Set());
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#181a22] text-zinc-100 border border-[#232634]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#13141a]'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="px-4 py-2 flex items-center justify-between shrink-0 bg-[#111216] border-b border-[#1c1d22]">
          <span className="text-[10px] text-zinc-400 font-mono">{selectedIds.size} selected</span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-1 text-zinc-400 hover:text-zinc-200 rounded transition"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="px-2.5 py-1 bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 border border-rose-900/40 rounded text-[10px] font-medium transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              <span>{bulkDeleting ? 'Deleting...' : 'Delete selected'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="flex-1 overflow-auto bg-[#090a0c]">
        {filtered.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-zinc-500 font-mono text-xs">
            <Layers className="w-6 h-6 text-zinc-700 mb-2" />
            <span>No templates found</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#0f1013] border-b border-[#1c1d22] text-zinc-400 uppercase text-[9px] font-mono tracking-wider sticky top-0 z-10">
                <th className="py-2.5 pl-4 pr-1">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSelectedIds((previous) => {
                        const next = new Set(previous);
                        filtered.forEach((item) => checked ? next.add(item.id) : next.delete(item.id));
                        return next;
                      });
                    }}
                    aria-label="Select all filtered templates"
                    className="accent-zinc-400"
                  />
                </th>
                <th className="py-2.5 px-4">Title & Slug</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Size</th>
                <th className="py-2.5 px-4">Downloads</th>
                <th className="py-2.5 px-4">Storage</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1d22]">
              {pageItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#121317] transition-colors">
                  <td className="py-2 pl-4 pr-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={(event) => {
                        setSelectedIds((previous) => {
                          const next = new Set(previous);
                          if (event.target.checked) next.add(item.id);
                          else next.delete(item.id);
                          return next;
                        });
                      }}
                      aria-label={`Select template ${item.title}`}
                      className="accent-zinc-400"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <span className="font-medium text-zinc-200 block text-[11px]">{item.title}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">/{item.slug}</span>
                  </td>
                  <td className="py-2 px-4 text-zinc-400 text-[11px]">{item.category}</td>
                  <td className="py-2 px-4 text-zinc-500 font-mono text-[10px]">
                    {(item.file_size / 1024).toFixed(1)} KB
                  </td>
                  <td className="py-2 px-4 text-zinc-400 font-mono text-[11px]">{item.downloads}</td>
                  <td className="py-2 px-4">
                    {item.r2_key ? (
                      <a
                        href={item.r2_url || `/api/r2/file/${item.r2_key}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-emerald-400/90 font-mono bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-900/40 px-1.5 py-0.5 rounded inline-flex items-center space-x-1 transition"
                        title="Open file via R2 delivery"
                      >
                        <span>R2 Synced</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-mono bg-[#14151b] border border-[#22242b] px-1.5 py-0.5 rounded">
                        Turso
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => onPreview(item)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#181a22] rounded transition cursor-pointer"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-[#181a22] rounded transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          onDelete(item.id);
                          setSelectedIds((previous) => {
                            const next = new Set(previous);
                            next.delete(item.id);
                            return next;
                          });
                        }}
                        className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 rounded transition cursor-pointer"
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
      <AdminTablePagination page={currentPage} totalRows={filtered.length} onPageChange={setPage} />
    </div>
  );
};
