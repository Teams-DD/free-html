import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Upload,
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
    description: string;
    seo_title: string;
    seo_description: string;
    seo_keywords: string;
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
<body class="flex items-center justify-center min-h-screen bg-[#090a0c] text-zinc-300 p-4">
  <div class="p-4 bg-[#121317] border border-[#22242b] rounded-md text-xs">
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
}) => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single file state
  const [title, setTitle] = useState(initialTemplate?.title || '');
  const [slug, setSlug] = useState(initialTemplate?.slug || '');
  const [category, setCategory] = useState(initialTemplate?.category || '');
  const [tagsInput, setTagsInput] = useState(initialTemplate?.tags.join(', ') || '');
  const [description, setDescription] = useState(initialTemplate?.description || '');
  const [seoTitle, setSeoTitle] = useState(initialTemplate?.seo_title || '');
  const [seoDescription, setSeoDescription] = useState(initialTemplate?.seo_description || '');
  const [seoKeywords, setSeoKeywords] = useState(initialTemplate?.seo_keywords || '');
  const [htmlContent, setHtmlContent] = useState(initialTemplate?.html_content || DEFAULT_HTML);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'split'>('split');

  // Bulk upload state
  const [bulkQueue, setBulkQueue] = useState<QueuedFile[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);

  const activeCategories = useMemo(() => categories.filter((c) => c.status === 'active'), [categories]);
  const categoryOptions = activeCategories.length > 0
    ? activeCategories.map((c) => c.name)
    : ['Buttons', 'Badges', 'Forms', 'Loaders', 'Alerts', 'Cards', 'Navigation', 'General'];

  useEffect(() => {
    if (activeCategories.length === 0) return;
    const firstCategory = activeCategories[0].name;
    if (!activeCategories.some((item) => item.name === category)) setCategory(firstCategory);
    if (!activeCategories.some((item) => item.name === bulkCategory)) setBulkCategory(firstCategory);
  }, [activeCategories, bulkCategory, category]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!initialTemplate) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
    }
  };

  const handleSingleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setHtmlContent(content);
        if (!title) {
          const autoTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
          const capTitle = autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1);
          setTitle(capTitle);
          setSlug(autoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems: QueuedFile[] = [];
    for (const file of files) {
      const text = await file.text();
      const rawName = file.name.replace(/\.[^/.]+$/, '');
      const itemTitle = rawName
        .split(/[-_]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      const itemSlug = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      newItems.push({
        name: file.name,
        title: itemTitle,
        slug: itemSlug,
        category: bulkCategory,
        size: file.size,
        content: text,
        status: 'pending',
      });
    }

    setBulkQueue((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeBulkItem = (index: number) => {
    setBulkQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkUploadSubmit = async () => {
    if (bulkQueue.length === 0) return;
    setBulkUploading(true);
    setBulkMessage(null);

    if (onBulkUpload) {
      const filesPayload = bulkQueue.map((f) => ({
        title: f.title,
        slug: f.slug,
        category: f.category || bulkCategory,
        tags: [f.category || bulkCategory, 'HTML'],
        html_content: f.content,
      }));

      const res = await onBulkUpload(filesPayload);
      if (res.success) {
        setBulkMessage(`Successfully uploaded ${res.uploaded} templates`);
        setBulkQueue([]);
      } else {
        setBulkMessage(`Upload error: ${res.error}`);
      }
    }
    setBulkUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      setError('Title and Slug are required');
      return;
    }

    setSaving(true);
    setError(null);

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
        description: description.trim(),
        seo_title: seoTitle.trim(),
        seo_description: seoDescription.trim(),
        seo_keywords: seoKeywords.trim(),
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
    <div className="flex-1 flex flex-col min-w-0 bg-[#090a0c] text-xs overflow-hidden">
      {/* Top Header */}
      <div className="h-12 px-4 bg-[#0f1013] border-b border-[#1c1d22] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onCancel}
            className="p-1 hover:bg-[#1a1b22] text-zinc-400 hover:text-zinc-200 rounded transition cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <h1 className="font-semibold text-zinc-200 text-xs uppercase tracking-tight">
            {initialTemplate ? 'Edit Template' : 'Add HTML Templates'}
          </h1>

          {!initialTemplate && (
            <div className="flex items-center bg-[#0c0d10] border border-[#22242b] rounded p-0.5 ml-2 text-[10px]">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  mode === 'single' ? 'bg-[#181a22] text-zinc-100 border border-[#232634] font-medium' : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Single Editor
              </button>
              <button
                type="button"
                onClick={() => setMode('bulk')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  mode === 'bulk' ? 'bg-[#181a22] text-zinc-100 border border-[#232634] font-medium' : 'text-zinc-400 hover:text-zinc-300'
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
              className="px-2.5 py-1 bg-[#14151b] hover:bg-[#1a1b22] text-zinc-300 border border-[#22242b] rounded text-[11px] font-medium transition flex items-center space-x-1 cursor-pointer"
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
              className="px-3 py-1 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-[11px] font-medium transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
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
              className="px-2.5 py-1 bg-[#14151b] hover:bg-[#1a1b22] text-zinc-300 border border-[#22242b] rounded text-[11px] font-medium transition flex items-center space-x-1 cursor-pointer"
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
              className="px-3 py-1 bg-[#22242c] hover:bg-[#2b2d38] text-zinc-200 border border-[#2e313c] rounded text-[11px] font-medium transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              <span>{bulkUploading ? 'Uploading...' : `Upload All (${bulkQueue.length})`}</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-950/40 border-b border-rose-900/50 px-4 py-2 text-[11px] text-rose-300 flex items-center space-x-1.5">
          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode 1: Multiple Files Bulk Upload */}
      {mode === 'bulk' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#090a0c]">
          {bulkMessage && (
            <div className="p-2.5 bg-[#121317] border border-[#22242b] rounded text-xs text-zinc-300">
              {bulkMessage}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Default Category:</span>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="px-2.5 py-1 bg-[#0c0d10] border border-[#22242b] rounded text-xs text-zinc-200 focus:outline-none focus:border-[#383b47]"
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
              className="border border-dashed border-[#262834] hover:border-[#3a3d4f] rounded-md p-10 flex flex-col items-center justify-center text-center cursor-pointer transition bg-[#0c0d10]"
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

              <div className="bg-[#121317] border border-[#22242b] rounded divide-y divide-[#1c1d22]">
                {bulkQueue.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5 min-w-0">
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
                      <span className="text-[10px] font-mono text-zinc-400 bg-[#0c0d10] px-1.5 py-0.5 rounded border border-[#22242b]">
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
        <div className="flex-1 flex flex-col min-h-0 bg-[#090a0c]">
          {/* Metadata Inputs Bar */}
          <div className="p-3 bg-[#0c0d10] border-b border-[#1c1d22] grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs shrink-0">
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                Title
              </label>
              <input
                type="text"
                required
                placeholder="Component title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full px-2.5 py-1 bg-[#090a0c] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                Slug
              </label>
              <input
                type="text"
                required
                placeholder="component-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-2.5 py-1 bg-[#090a0c] border border-[#22242b] rounded text-xs text-zinc-200 font-mono placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-1 bg-[#090a0c] border border-[#22242b] rounded text-xs text-zinc-200 focus:outline-none focus:border-[#383b47]"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Button, Dark, Tailwind"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full px-2.5 py-1 bg-[#090a0c] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">
                Template Description (optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short summary; used as the SEO description when no override is set"
                className="w-full px-2.5 py-1.5 bg-[#090a0c] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47] resize-y"
              />
            </div>

            <div className="sm:col-span-4 border-t border-[#1c1d22] pt-3 space-y-3">
              <span className="block text-[10px] font-semibold text-zinc-300 uppercase tracking-wider">SEO Metadata</span>
              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">SEO Title</label>
                <input
                  type="text"
                  maxLength={70}
                  value={seoTitle}
                  onChange={(event) => setSeoTitle(event.target.value)}
                  placeholder={title ? `${title} HTML Template | Vib Tools` : 'Generated from template title'}
                  className="w-full px-2.5 py-1 bg-[#090a0c] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">SEO Description</label>
                <textarea
                  rows={2}
                  maxLength={160}
                  value={seoDescription}
                  onChange={(event) => setSeoDescription(event.target.value)}
                  placeholder="Generated from template title, category, and description"
                  className="w-full px-2.5 py-1.5 bg-[#090a0c] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47] resize-y"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 uppercase tracking-wider mb-1">SEO Keywords (comma-separated)</label>
                <input
                  type="text"
                  maxLength={255}
                  value={seoKeywords}
                  onChange={(event) => setSeoKeywords(event.target.value)}
                  placeholder="Generated from title, category, and tags"
                  className="w-full px-2.5 py-1 bg-[#090a0c] border border-[#22242b] rounded text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#383b47]"
                />
              </div>
              <p className="text-[10px] text-zinc-500">Leave blank to generate compact metadata automatically.</p>
            </div>
          </div>

          {/* View Mode Bar */}
          <div className="px-4 py-1.5 bg-[#0e0f13] border-b border-[#1c1d22] flex items-center justify-between text-[11px] shrink-0">
            <span className="text-[10px] text-zinc-400 uppercase font-mono">
              HTML Content ({new TextEncoder().encode(htmlContent).length} Bytes)
            </span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-2.5 py-0.5 rounded text-[10px] transition cursor-pointer ${
                  activeTab === 'editor' ? 'bg-[#181a22] text-zinc-100 border border-[#232634]' : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Code Only
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('split')}
                className={`px-2.5 py-0.5 rounded text-[10px] transition cursor-pointer ${
                  activeTab === 'split' ? 'bg-[#181a22] text-zinc-100 border border-[#232634]' : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Split View
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-0.5 rounded text-[10px] transition cursor-pointer ${
                  activeTab === 'preview' ? 'bg-[#181a22] text-zinc-100 border border-[#232634]' : 'text-zinc-400 hover:text-zinc-300'
                }`}
              >
                Preview Only
              </button>
            </div>
          </div>

          {/* Editor & Preview Panels */}
          <div className="flex-1 flex min-h-0 overflow-hidden bg-[#090a0c]">
            {(activeTab === 'editor' || activeTab === 'split') && (
              <div
                className={`flex-1 flex flex-col bg-[#090a0c] min-w-0 ${
                  activeTab === 'split' ? 'border-r border-[#1c1d22]' : ''
                }`}
              >
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="w-full h-full p-4 bg-[#090a0c] text-zinc-200 font-mono text-[11px] leading-relaxed resize-none focus:outline-none selection:bg-[#27272a]"
                  spellCheck={false}
                />
              </div>
            )}

            {(activeTab === 'preview' || activeTab === 'split') && (
              <div className="flex-1 flex flex-col bg-[#0b0c0e] min-w-0 overflow-hidden">
                <iframe
                  title="Live Preview"
                  srcDoc={htmlContent}
                  sandbox="allow-scripts allow-modals"
                  className="w-full h-full border-0 bg-[#0b0c0e]"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
