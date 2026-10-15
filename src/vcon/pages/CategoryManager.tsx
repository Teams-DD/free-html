import React, { useState, useMemo } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Save,
  RefreshCw,
} from 'lucide-react';
import { Category } from '../../types.ts';
import { AdminTablePagination } from '../components/AdminTablePagination.tsx';
import { useAdminConfirmation } from '../components/AdminConfirmation.tsx';

interface Props {
  categories: Category[];
  loading: boolean;
  onRefresh: () => void;
  onSaveCategory: (data: { id?: string; name: string; slug: string; status?: 'active' | 'inactive' }) => Promise<{ success: boolean; error?: string }>;
  onToggleStatus: (id: string, status: 'active' | 'inactive') => Promise<boolean>;
  onDeleteCategory: (id: string) => Promise<boolean>;
  onBulkDelete: (ids: string[]) => Promise<void>;
}

export const CategoryManager: React.FC<Props> = ({
  categories,
  loading,
  onRefresh,
  onSaveCategory,
  onToggleStatus,
  onDeleteCategory,
  onBulkDelete,
}) => {
  const requestConfirmation = useAdminConfirmation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setStatus('active');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setStatus(cat.status);
    setError(null);
    setModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    const res = await onSaveCategory({
      id: editingCategory?.id,
      name: name.trim(),
      slug: slug.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-'),
      status,
    });

    setSubmitting(false);
    if (res.success) {
      setModalOpen(false);
      onRefresh();
    } else {
      setError(res.error || 'Failed to save category');
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    );
  }, [categories, search]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const allFilteredSelected = filtered.length > 0 && filtered.every((category) => selectedIds.has(category.id));

  const handleBulkDelete = async () => {
    const ids = filtered.filter((category) => selectedIds.has(category.id)).map((category) => category.id);
    if (ids.length === 0) return;
    const confirmed = await requestConfirmation({
      title: 'Delete selected categories?',
      message: `Delete ${ids.length} selected categor${ids.length === 1 ? 'y' : 'ies'}?`,
      confirmLabel: 'Delete categories',
    });
    if (!confirmed) return;

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
      <div className="h-12 px-4 bg-[#0f1013] border-b border-[#1c1d22] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <FolderTree className="w-4 h-4 text-zinc-400" />
          <h1 className="font-semibold text-zinc-200 uppercase text-xs tracking-tight">
            Categories
          </h1>
          <span className="text-[10px] text-zinc-400 font-mono bg-[#14151b] border border-[#22242b] px-2 py-0.5 rounded">
            {categories.length}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filter categories..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIds(new Set());
                setPage(1);
              }}
              className="pl-7 pr-2.5 py-1 bg-[#090a0c] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#383b47] w-36 sm:w-48"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 bg-[#14151b] hover:bg-[#1a1b22] text-zinc-400 hover:text-zinc-200 border border-[#22242b] rounded transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openAddModal}
            className="px-2.5 py-1.5 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-400" />
            <span>New Category</span>
          </button>
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
            <FolderTree className="w-6 h-6 text-zinc-700 mb-2" />
            <span>No categories found</span>
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
                        filtered.forEach((category) => checked ? next.add(category.id) : next.delete(category.id));
                        return next;
                      });
                    }}
                    aria-label="Select all filtered categories"
                    className="accent-zinc-400"
                  />
                </th>
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4">Slug</th>
                <th className="py-2.5 px-4">Templates</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1d22]">
              {pageItems.map((cat) => (
                <tr key={cat.id} className="hover:bg-[#121317] transition-colors">
                  <td className="py-2 pl-4 pr-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(cat.id)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelectedIds((previous) => {
                          const next = new Set(previous);
                          if (checked) next.add(cat.id);
                          else next.delete(cat.id);
                          return next;
                        });
                      }}
                      aria-label={`Select category ${cat.name}`}
                      className="accent-zinc-400"
                    />
                  </td>
                  <td className="py-2 px-4 font-medium text-zinc-200">{cat.name}</td>
                  <td className="py-2 px-4 font-mono text-zinc-400 text-[11px]">/{cat.slug}</td>
                  <td className="py-2 px-4 font-mono text-zinc-400 text-[11px]">
                    <span className="bg-[#14151b] border border-[#22242b] px-2 py-0.5 rounded">
                      {cat.item_count || 0}
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <button
                      onClick={() =>
                        onToggleStatus(cat.id, cat.status === 'active' ? 'inactive' : 'active')
                      }
                      className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase cursor-pointer border ${
                        cat.status === 'active'
                          ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40'
                          : 'bg-[#14151b] text-zinc-500 border-[#22242b]'
                      }`}
                    >
                      {cat.status === 'active' ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-2.5 h-2.5" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 hover:bg-[#181a22] text-zinc-400 hover:text-zinc-200 rounded transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          const deleted = await onDeleteCategory(cat.id);
                          if (deleted) {
                            setSelectedIds((previous) => {
                              const next = new Set(previous);
                              next.delete(cat.id);
                              return next;
                            });
                          }
                        }}
                        className="p-1.5 hover:bg-rose-950/20 text-zinc-400 hover:text-rose-400 rounded transition cursor-pointer"
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

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-[#121317] border border-[#22242b] rounded-lg w-full max-w-sm overflow-hidden">
            <div className="px-4 py-3 bg-[#0f1013] border-b border-[#1c1d22] flex items-center justify-between">
              <span className="font-semibold text-zinc-200 text-xs">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </span>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {error && (
                <div className="p-2 bg-rose-950/40 border border-rose-900/50 rounded text-rose-300 text-[11px]">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Navigation"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. navigation"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-2.5 py-1.5 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 focus:outline-none focus:border-[#383b47]"
                >
                  <option value="active">Active (Visible)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-xs font-medium transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  <span>{submitting ? 'Saving...' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
