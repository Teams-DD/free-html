import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Upload,
  Code2,
  Eye,
  Check,
  AlertCircle,
  Files,
  Trash2,
  FileText,
} from 'lucide-react';
import { HtmlTemplate, Category } from '../../types.ts';

interface Props {
  initialTemplate?: HtmlTemplate | null;
  categories?: Category[];
  onSave: (data: {
    id?: string;
    title: string;
    slug: string;
    category: string;
    tags: string[];
    html_content: string;
  }) => Promise<{ success: boolean; error?: string; r2Uploaded?: boolean }>;
  onBulkUpload?: (
    files: Array<{ title: string; slug?: string; category?: string; tags?: string[]; html_content: string }>
  ) => Promise<{ success: boolean; uploaded?: number; failed?: number; error?: string }>;
  onCancel: () => void;
  r2Connected: boolean;
}

interface QueuedFile {
  name: string;
  title: string;
  slug: string;
  category: string;
  size: number;
  content: string;
  status: 'pending' | 'success' | 'error';
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex items-center justify-center min-h-screen bg-zinc-950 p-4">
  <div class="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs">
    HTML Component
  </div>
</body>
</html>`;

export const TemplateCreateEdit: React.FC<Props> = ({
  initialTemplate,
  categories = [],
  onSave,
  onBulkUpload,
  onCancel,
  r2Connected,
}) => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single file state
  const [title, setTitle] = useState(initialTemplate?.title || '');
  const [slug, setSlug] = useState(initialTemplate?.slug || '');
  const [category, setCategory] = useState(initialTemplate?.category || 'General');
  const [tagsInput, setTagsInput] = useState(initialTemplate?.tags.join(', ') || '');
  const [htmlContent, setHtmlContent] = useState(initialTemplate?.html_content || DEFAULT_HTML);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'split'>('split');

  // Bulk upload state
  const [bulkQueue, setBulkQueue] = useState<QueuedFile[]>([]);
  const [bulkCategory, setBulkCategory] = useState('General');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);

  const activeCategories = categories.filter((c) => c.status === 'active');
  const categoryOptions = activeCategories.length > 0
    ? activeCategories.map((c) => c.name)
    : ['Buttons', 'Badges', 'Forms', 'Loaders', 'Alerts', 'Cards', 'Navigation', 'General'];

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialTemplate) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
    }
  };

  const handleSingleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    if (!title) {
      setTitle(nameWithoutExt);
      setSlug(nameWithoutExt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) setHtmlContent(text);
    };
    reader.readAsText(file);
  };

  // Multiple files selection
  const handleBulkFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newQueue: QueuedFile[] = [];
    let readCount = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const rawName = file.name.replace(/\.[^/.]+$/, '');
      const cleanSlug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          newQueue.push({
            name: file.name,
            title: rawName,
            slug: cleanSlug,
            category: bulkCategory,
            size: file.size,
            content,
            status: 'pending',
          });
        }
        readCount++;
        if (readCount === files.length) {
          setBulkQueue((prev) => [...prev, ...newQueue]);
        }
      };
      reader.readAsText(file);
    });

    if (e.target) e.target.value = '';
  };

  const handleBulkUploadSubmit = async () => {
    if (bulkQueue.length === 0 || !onBulkUpload) return;
    setBulkUploading(true);
    setBulkMessage(null);

    const payload = bulkQueue.map((item) => ({
      title: item.title,
      slug: item.slug,
      category: item.category || bulkCategory,
      tags: [item.category || bulkCategory],
      html_content: item.content,
    }));

    try {
      const res = await onBulkUpload(payload);
      if (res.success) {
        setBulkMessage(`Successfully uploaded ${res.uploaded} HTML templates.`);
        setBulkQueue((prev) => prev.map((f) => ({ ...f, status: 'success' })));
        setTimeout(() => {
          onCancel();
        }, 1500);
      } else {
        setBulkMessage(`Upload error: ${res.error || 'Failed to upload'}`);
      }
    } catch (err: any) {
      setBulkMessage(`Error: ${err?.message}`);
    } finally {
      setBulkUploading(false);
    }
  };

  const removeBulkItem = (index: number) => {
    setBulkQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !slug.trim() || !htmlContent.trim()) {
      setError('Title, slug, and HTML content are required');
      return;
    }

    setSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await onSave({
        id: initialTemplate?.id,
        title: title.trim(),
        slug: slug.trim().toLowerCase(),
        category,
        tags,
        html_content: htmlContent,
      });

      if (!res.success) {
        setError(res.error || 'Failed to save template');
      }
    } catch (err: any) {
      setError(err?.message || 'Error saving template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-900 text-xs overflow-hidden">
      {/* Header Bar */}
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={onCancel}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold text-zinc-200 text-xs uppercase tracking-tight">
            {initialTemplate ? 'Edit Template' : 'Add HTML Templates'}
          </span>

          {!initialTemplate && (
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 ml-2 text-[10px]">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  mode === 'single' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Single Editor
              </button>
              <button
                type="button"
                onClick={() => setMode('bulk')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  mode === 'bulk' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Multiple Files Upload
              </button>
            </div>
          )}
        </div>

        {mode === 'single' ? (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded text-[11px] font-medium transition flex items-center space-x-1 cursor-pointer"
            >
              <Upload className="w-3 h-3 text-zinc-400" />
              <span>Import .html</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={handleSingleFileUpload}
              className="hidden"
            />

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700/60 rounded text-[11px] font-medium transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              <span>{saving ? 'Saving...' : 'Save Template'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => bulkInputRef.current?.click()}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded text-[11px] font-medium transition flex items-center space-x-1 cursor-pointer"
            >
              <Files className="w-3 h-3 text-zinc-400" />
              <span>Select Multiple Files</span>
            </button>
            <input
              ref={bulkInputRef}
              type="file"
              accept=".html,.htm"
              multiple
              onChange={handleBulkFilesSelect}
              className="hidden"
            />

            <button
              onClick={handleBulkUploadSubmit}
              disabled={bulkUploading || bulkQueue.length === 0}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700/60 rounded text-[11px] font-medium transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              <span>{bulkUploading ? 'Uploading...' : `Upload All (${bulkQueue.length})`}</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-950/40 border-b border-rose-800/50 px-3 py-1.5 text-[11px] text-rose-300 flex items-center space-x-1.5">
          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode 1: Multiple Files Bulk Upload */}
      {mode === 'bulk' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          {bulkMessage && (
            <div className="p-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300">
              {bulkMessage}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Default Category:</span>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {bulkQueue.length === 0 ? (
            <div
              onClick={() => bulkInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-zinc-950/40"
            >
              <Files className="w-8 h-8 text-zinc-600 mb-2" />
              <p className="text-xs font-medium text-zinc-300 mb-1">
                Click to select single or multiple .html files
              </p>
              <p className="text-[10px] text-zinc-500 font-mono">
                Supports batch upload directly into Turso SQLite & Cloudflare R2
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase font-mono px-1">
                <span>Queued Files ({bulkQueue.length})</span>
                <button
                  onClick={() => setBulkQueue([])}
                  className="text-zinc-500 hover:text-rose-400 cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="bg-zinc-950 border border-zinc-850 rounded divide-y divide-zinc-850">
                {bulkQueue.map((item, idx) => (
                  <div key={idx} className="p-2 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium text-zinc-200 truncate block text-[11px]">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {(item.size / 1024).toFixed(1)} KB • /{item.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                        {item.category}
                      </span>
                      {item.status === 'success' && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <button
                        onClick={() => removeBulkItem(idx)}
                        className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Single File Detailed Editor */}
      {mode === 'single' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Metadata Inputs Bar */}
          <div className="p-2.5 bg-zinc-950 border-b border-zinc-850 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs shrink-0">
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">
                Title
              </label>
              <input
                type="text"
                required
                placeholder="Component title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">
                Slug
              </label>
              <input
                type="text"
                required
                placeholder="component-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 focus:outline-none focus:border-zinc-700"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Button, Dark, Tailwind"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          {/* View Mode Bar */}
          <div className="px-3 py-1 bg-zinc-900/60 border-b border-zinc-850 flex items-center justify-between text-[11px] shrink-0">
            <span className="text-[10px] text-zinc-400 uppercase font-mono">
              HTML Content ({new TextEncoder().encode(htmlContent).length} Bytes)
            </span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                  activeTab === 'editor' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Code Only
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('split')}
                className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                  activeTab === 'split' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Split View
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-2 py-0.5 rounded text-[10px] transition cursor-pointer ${
                  activeTab === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Preview Only
              </button>
            </div>
          </div>

          {/* Editor & Preview Panels */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {(activeTab === 'editor' || activeTab === 'split') && (
              <div
                className={`flex-1 flex flex-col bg-zinc-950 min-w-0 ${
                  activeTab === 'split' ? 'border-r border-zinc-850' : ''
                }`}
              >
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="w-full h-full p-3 bg-zinc-950 text-zinc-200 font-mono text-[11px] leading-relaxed resize-none focus:outline-none selection:bg-zinc-800"
                  spellCheck={false}
                />
              </div>
            )}

            {(activeTab === 'preview' || activeTab === 'split') && (
              <div className="flex-1 flex flex-col bg-zinc-900 min-w-0 overflow-hidden">
                <iframe
                  title="Live Preview"
                  srcDoc={htmlContent}
                  sandbox="allow-scripts allow-modals"
                  className="w-full h-full border-0 bg-white"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
