import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Download,
  Eye,
  Search,
  Monitor,
  Tablet,
  Smartphone,
  Copy,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { HtmlTemplate, SiteSettings } from '../types.ts';

export const PublicApp: React.FC = () => {
  const [snippets, setSnippets] = useState<HtmlTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: 'HTML Snippets & Templates',
    site_description: 'Free responsive HTML snippets and component templates directory.',
    app_logo: '',
    favicon_url: '',
    og_image: '',
  });

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal preview state
  const [activeModal, setActiveModal] = useState<HtmlTemplate | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [deviceSize, setDeviceSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Feedback toast
  const [toastText, setToastText] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const showToast = (text: string) => {
    setToastText(text);
    setTimeout(() => setToastText(null), 2500);
  };

  // Load site settings and apply dynamic SEO metadata & favicon
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data: any = await res.json();
        if (res.ok && data.success && data.settings) {
          setSettings(data.settings);

          if (data.settings.site_name) {
            document.title = data.settings.site_name;
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.setAttribute('content', data.settings.site_name);
          }

          if (data.settings.site_description) {
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) metaDesc.setAttribute('content', data.settings.site_description);
            const ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) ogDesc.setAttribute('content', data.settings.site_description);
          }

          if (data.settings.favicon_url) {
            let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = data.settings.favicon_url;
          }

          if (data.settings.og_image) {
            let ogImg = document.querySelector('meta[property="og:image"]');
            if (!ogImg) {
              ogImg = document.createElement('meta');
              ogImg.setAttribute('property', 'og:image');
              document.head.appendChild(ogImg);
            }
            ogImg.setAttribute('content', data.settings.og_image);
          }
        }
      } catch {
        // Fallback to default
      }
    }
    loadSettings();
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      const data: any = await res.json();
      if (res.ok && data.success) {
        setSnippets(data.items || []);
      } else {
        setSnippets([]);
      }
    } catch {
      setSnippets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Categories list derived from real templates
  const categories = useMemo(() => {
    const list = new Set(snippets.map((s) => s.category).filter(Boolean));
    return ['all', ...Array.from(list)];
  }, [snippets]);

  // Filtered snippets
  const filteredSnippets = useMemo(() => {
    return snippets.filter((item) => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.slug.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [snippets, selectedCategory, search]);

  const handleDownload = async (item: HtmlTemplate) => {
    try {
      fetch(`/api/templates/${item.slug}/download`, { method: 'POST' }).catch(() => {});

      const blob = new Blob([item.html_content], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.slug || 'snippet'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Downloaded successfully');

      setSnippets((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, downloads: s.downloads + 1 } : s))
      );
    } catch {
      showToast('Download failed');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    showToast('HTML copied to clipboard');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-[#090a0c] text-zinc-300 flex flex-col font-sans selection:bg-zinc-800 selection:text-zinc-200 antialiased">
      {/* Refined Minimal Header */}
      <header className="bg-[#0f1013] border-b border-zinc-800/90 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {settings.app_logo ? (
              <img
                src={settings.app_logo}
                alt={settings.site_name}
                className="w-5 h-5 object-contain rounded"
              />
            ) : (
              <div className="w-5 h-5 bg-zinc-800 rounded flex items-center justify-center text-zinc-300 font-semibold text-[10px]">
                {settings.site_name.charAt(0).toUpperCase() || 'H'}
              </div>
            )}
            <h1 className="text-xs font-semibold tracking-tight uppercase text-zinc-200">
              {settings.site_name || 'HTML Snippets'}
            </h1>
          </div>

          <div className="hidden md:flex items-center space-x-1 pl-3 text-[11px]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer shadow-none border-0 ${
                  selectedCategory === cat
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1 bg-[#131418] border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 w-32 sm:w-48 transition shadow-none"
            />
          </div>

          {/* Item count badge */}
          <div className="text-[11px] text-zinc-400 font-mono bg-[#131418] border border-zinc-800 px-2.5 py-1 rounded shrink-0 shadow-none">
            {snippets.length} Items
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto p-3.5 sm:px-8 sm:py-5 lg:px-10 overflow-y-auto">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-xs text-zinc-500 font-mono">
            Loading snippets...
          </div>
        ) : filteredSnippets.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-[#121317] border border-zinc-800 rounded-md shadow-none">
            <Layers className="w-7 h-7 text-zinc-500 mb-2" />
            <p className="text-xs text-zinc-400 font-medium">
              No snippets found
            </p>
          </div>
        ) : (
          /* Responsive Grid: 4 cards per row on desktop, 3 on tablet, 1-2 on mobile */
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            id="card-grid"
          >
            {filteredSnippets.map((item) => (
              <div
                key={item.id}
                className="bg-[#121317] border border-zinc-800 hover:border-zinc-750 rounded-md transition-colors duration-150 flex flex-col overflow-hidden group h-full shadow-none"
              >
                {/* HTML Preview Frame */}
                <div className="h-56 sm:h-60 bg-[#0b0c0e] border-b border-zinc-800/80 relative overflow-hidden flex items-center justify-center">
                  <iframe
                    title={item.title}
                    srcDoc={item.html_content}
                    sandbox="allow-scripts"
                    className="absolute left-0 top-0 w-[400%] h-[400%] max-w-none border-0 pointer-events-none scale-[0.25] origin-top-left opacity-95 group-hover:opacity-100 transition-opacity duration-150 shadow-none"
                  />
                  <div className="absolute inset-0 bg-transparent" />

                  {/* Subtle badges */}
                  <div className="absolute top-2 left-2 flex items-center pointer-events-none">
                    <span className="text-[10px] font-medium text-zinc-400 bg-[#121317]/90 border border-zinc-800 px-2 py-0.5 rounded shadow-none">
                      {item.category}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 flex items-center pointer-events-none">
                    <span className="text-[10px] font-mono text-zinc-400 bg-[#121317]/90 border border-zinc-800 px-2 py-0.5 rounded shadow-none">
                      {(item.file_size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>

                {/* Compact Info & Buttons Section */}
                <div className="p-3 flex flex-col justify-between bg-[#121317]">
                  <div className="flex items-center justify-between gap-1.5 mb-2.5">
                    <h3
                      className="text-xs font-medium text-zinc-200 truncate tracking-tight"
                      title={item.title}
                    >
                      {item.title}
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-mono shrink-0 flex items-center space-x-1">
                      <Download className="w-2.5 h-2.5 text-zinc-400" />
                      <span>{item.downloads}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => {
                        setActiveModal(item);
                        setViewMode('preview');
                        setDeviceSize('desktop');
                      }}
                      className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-zinc-100 rounded text-[11px] font-medium transition flex items-center justify-center space-x-1 cursor-pointer shadow-none border-0"
                    >
                      <Eye className="w-3 h-3 text-zinc-400" />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => handleDownload(item)}
                      className="flex-1 py-1.5 px-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-zinc-100 rounded text-[11px] font-medium transition flex items-center justify-center space-x-1 cursor-pointer shadow-none border-0"
                    >
                      <Download className="w-3 h-3 text-zinc-400" />
                      <span>Download</span>
                    </button>

                    <button
                      onClick={() => handleCopyCode(item.html_content)}
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 rounded transition flex items-center justify-center cursor-pointer shadow-none border-0"
                      title="Copy HTML"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <footer className="mt-8 border-t border-zinc-800/80 py-3 flex flex-col items-center justify-between gap-1.5 text-[10px] text-zinc-500 sm:flex-row">
          <span className="font-medium text-zinc-400">{settings.site_name || 'HTML Snippets'}</span>
          <span>© {new Date().getFullYear()}</span>
        </footer>
      </main>

      {/* View Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-[#121317] border border-zinc-800 w-full h-full max-w-5xl max-h-[90vh] rounded-md flex flex-col overflow-hidden shadow-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0f1013] border-b border-zinc-800 shrink-0">
              <div className="flex items-center space-x-2.5 truncate pr-2">
                <span className="text-xs font-medium text-zinc-200 truncate">
                  {activeModal.title}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                  {(activeModal.file_size / 1024).toFixed(1)} KB
                </span>
              </div>

              {/* Center controls */}
              <div className="flex items-center space-x-2">
                {viewMode === 'preview' && (
                  <div className="hidden sm:flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded shadow-none">
                    <button
                      onClick={() => setDeviceSize('desktop')}
                      className={`p-1.5 rounded transition cursor-pointer shadow-none border-0 ${
                        deviceSize === 'desktop'
                          ? 'bg-zinc-800 text-zinc-200'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title="Desktop"
                    >
                      <Monitor className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setDeviceSize('tablet')}
                      className={`p-1.5 rounded transition cursor-pointer shadow-none border-0 ${
                        deviceSize === 'tablet'
                          ? 'bg-zinc-800 text-zinc-200'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title="Tablet (768px)"
                    >
                      <Tablet className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setDeviceSize('mobile')}
                      className={`p-1.5 rounded transition cursor-pointer shadow-none border-0 ${
                        deviceSize === 'mobile'
                          ? 'bg-zinc-800 text-zinc-200'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title="Mobile (375px)"
                    >
                      <Smartphone className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded text-[10px] shadow-none">
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-2.5 py-1 rounded font-medium transition cursor-pointer shadow-none border-0 ${
                      viewMode === 'preview'
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setViewMode('code')}
                    className={`px-2.5 py-1 rounded font-medium transition cursor-pointer shadow-none border-0 ${
                      viewMode === 'code'
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    HTML
                  </button>
                </div>

                {viewMode === 'code' && (
                  <button
                    onClick={() => handleCopyCode(activeModal.html_content)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-zinc-100 rounded text-[11px] font-medium transition flex items-center space-x-1 cursor-pointer shadow-none border-0"
                  >
                    {codeCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => handleDownload(activeModal)}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-zinc-100 rounded text-[11px] font-medium transition flex items-center space-x-1 cursor-pointer shadow-none border-0"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => setActiveModal(null)}
                  className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer shadow-none border-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 bg-[#0b0c0e] relative overflow-hidden flex items-center justify-center p-2">
              {viewMode === 'preview' ? (
                <div
                  className={`h-full bg-[#0b0c0e] transition-all duration-200 overflow-hidden border border-zinc-800 rounded shadow-none ${
                    deviceSize === 'mobile'
                      ? 'w-[375px]'
                      : deviceSize === 'tablet'
                      ? 'w-[768px]'
                      : 'w-full'
                  }`}
                >
                  <iframe
                    title="Modal Preview"
                    srcDoc={activeModal.html_content}
                    sandbox="allow-scripts allow-modals"
                    className={`border-0 shadow-none ${
                      deviceSize === 'desktop'
                        ? 'w-[133.333%] h-[133.333%] scale-75 origin-center'
                        : 'w-full h-full'
                    }`}
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-[#0b0c0e] p-3.5 overflow-auto shadow-none">
                  <pre className="text-zinc-300 font-mono text-[11px] leading-relaxed selection:bg-zinc-800">
                    {activeModal.html_content}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastText && (
        <div className="fixed bottom-3 right-3 bg-[#18191f] border border-zinc-800 text-zinc-200 text-xs px-3.5 py-2 rounded transition-all duration-300 z-50 shadow-none">
          {toastText}
        </div>
      )}
    </div>
  );
};
