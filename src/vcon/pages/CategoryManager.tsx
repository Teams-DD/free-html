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

interface Props {
  categories: Category[];
  loading: boolean;
  onRefresh: () => void;
  onSaveCategory: (data: { id?: string; name: string; slug: string; status?: 'active' | 'inactive' }) => Promise<{ success: boolean; error?: string }>;
  onToggleStatus: (id: string, status: 'active' | 'inactive') => Promise<boolean>;
  onDeleteCategory: (id: string) => Promise<boolean>;
}

export const CategoryManager: React.FC<Props> = ({
  categories,
  loading,
  onRefresh,
  onSaveCategory,
  onToggleStatus,
  onDeleteCategory,
}) => {
  const [search, setSearch] = useState('');
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

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-900 text-xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-2">
          <FolderTree className="w-4 h-4 text-zinc-400" />
          <h2 className="font-semibold text-zinc-200 uppercase text-xs tracking-tight">
            Categories ({categories.length})
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Filter categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 pr-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 w-36 sm:w-48"
            />
          </div>

          <button
            onClick={onRefresh}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={openAddModal}
            className="px-2.5 py-1 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-750/60 rounded text-xs font-medium transition flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-zinc-500 font-mono text-xs">
            Loading categories...
          </div>
        ) : filtered.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-zinc-500 font-mono text-xs">
            No categories found.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Slug</th>
                <th className="py-2 px-3">Templates</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {filtered.map((cat) => (
                <tr key={cat.id} className="hover:bg-zinc-850/40 transition-colors">
                  <td className="py-2 px-3 font-medium text-zinc-200">{cat.name}</td>
                  <td className="py-2 px-3 font-mono text-zinc-400 text-[11px]">/{cat.slug}</td>
                  <td className="py-2 px-3 font-mono text-zinc-400 text-[11px]">
                    <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      {cat.item_count || 0}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() =>
                        onToggleStatus(cat.id, cat.status === 'active' ? 'inactive' : 'active')
                      }
                      className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase cursor-pointer border ${
                        cat.status === 'active'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-800'
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
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDeleteCategory(cat.id)}
                        className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 rounded transition cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-3.5 py-2.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
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

            <form onSubmit={handleSubmit} className="p-3.5 space-y-3">
              {error && (
                <div className="p-2 bg-rose-950/40 border border-rose-800/50 rounded text-rose-300 text-[11px]">
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
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
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
                  className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
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
                  className="px-3 py-1 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-750/60 rounded text-xs font-medium transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
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
