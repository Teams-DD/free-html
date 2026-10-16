import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Download,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Monitor,
  Tablet,
  Smartphone,
  Copy,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { PublicTemplateMetadata, SiteSettings } from '../types.ts';
import { DevLogEntry, DevLogPanel } from './DevLogPanel.tsx';

const rawTemplateUrl = (slug: string, hideScrollbars = false) =>
  `/api/templates/${encodeURIComponent(slug)}/raw${hideScrollbars ? '?hide_scrollbars=1' : ''}`;
const templateModalUrl = (slug: string, state: 'opened' | 'closed'): string | null => {
  const pathname = `/${encodeURIComponent(slug)}`;
  const normalizedPathname = new URL(pathname, window.location.origin).pathname;
  if (normalizedPathname !== pathname || normalizedPathname.split('/').filter(Boolean).length !== 1) return null;
  return `${pathname}?${state}`;
};
const TEMPLATE_PAGE_SIZES = [12, 24, 48];

export const PublicApp: React.FC = () => {
  const [snippets, setSnippets] = useState<PublicTemplateMetadata[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: 'HTML Snippets & Templates',
    site_description: 'Free responsive HTML snippets and component templates directory.',
    app_logo: '',
    favicon_url: '',
    og_image: '',
    dev_mode: false,
  });

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [devLogs, setDevLogs] = useState<DevLogEntry[]>([]);
  const devModeRef = useRef<boolean | null>(null);

  const addDevLog = useCallback((level: DevLogEntry['level'], message: string, details?: DevLogEntry['details']) => {
    if (devModeRef.current === false) return;
    setDevLogs((current) => [
      ...current.slice(-99),
      { time: new Date().toISOString(), level, message, details },
    ]);
  }, []);

  const recordApiResponse = useCallback((method: string, endpoint: string, response: Response, startedAt: number) => {
    const path = new URL(endpoint, window.location.origin).pathname
      .replace(/^\/api\/templates\/[^/]+\/download$/, '/api/templates/:slug/download');
    const contentLength = response.headers.get('content-length');
    const resourceUrl = response.url || new URL(endpoint, window.location.origin).href;
    const resourceTiming = performance.getEntriesByName(resourceUrl, 'resource').at(-1) as PerformanceResourceTiming | undefined;

    addDevLog(response.ok ? 'info' : 'error', `${method} ${path} -> ${response.status}`, {
      duration_ms: Math.round(performance.now() - startedAt),
      content_length_header_bytes: contentLength ? Number(contentLength) : null,
      decoded_body_bytes: resourceTiming?.decodedBodySize || null,
      transfer_bytes: resourceTiming?.transferSize || null,
      content_type: response.headers.get('content-type'),
      cache_control: response.headers.get('cache-control'),
      cf_cache_status: response.headers.get('cf-cache-status'),
      cf_ray: response.headers.get('cf-ray'),
      age: response.headers.get('age'),
      server_timing: response.headers.get('server-timing'),
    });
  }, [addDevLog]);

  const recordApiFailure = useCallback((method: string, endpoint: string, error: unknown) => {
    const path = new URL(endpoint, window.location.origin).pathname
      .replace(/^\/api\/templates\/[^/]+\/download$/, '/api/templates/:slug/download');
    const errorName = error instanceof Error ? error.name : 'RequestError';
    addDevLog('error', `${method} ${path} failed`, { error: errorName });
  }, [addDevLog]);

  // Modal preview state
  const [activeModal, setActiveModal] = useState<PublicTemplateMetadata | null>(null);
  const [modalRouteError, setModalRouteError] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [modalHtml, setModalHtml] = useState<string | null>(null);
  const [modalHtmlError, setModalHtmlError] = useState(false);
  const [deviceSize, setDeviceSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.5);
  const templateHtmlCache = useRef(new Map<string, string>());
  const templateHtmlRequests = useRef(new Map<string, Promise<string>>());
  const snippetsRef = useRef(snippets);
  const loadingRef = useRef(loading);
  const activeModalRef = useRef(activeModal);
  snippetsRef.current = snippets;
  loadingRef.current = loading;
  activeModalRef.current = activeModal;

  const syncModalFromLocation = useCallback(() => {
    const url = new URL(window.location.href);
    const isOpened = url.searchParams.has('opened');
    const isClosed = url.searchParams.has('closed');

    if (isOpened && isClosed) {
      setActiveModal(null);
      setModalRouteError(true);
      return;
    }

    if (!isOpened) {
      setActiveModal(null);
      setModalRouteError(false);
      return;
    }

    const pathSegments = url.pathname.split('/').filter(Boolean);
    if (pathSegments.length !== 1) {
      setActiveModal(null);
      setModalRouteError(true);
      return;
    }

    let slug: string;
    try {
      slug = decodeURIComponent(pathSegments[0]);
    } catch {
      setActiveModal(null);
      setModalRouteError(true);
      return;
    }

    const template = snippetsRef.current.find((item) => item.slug === slug);
    if (template) {
      setModalRouteError(false);
      if (activeModalRef.current?.slug !== template.slug) {
        setActiveModal(template);
        setViewMode('preview');
        setModalHtml(null);
        setModalHtmlError(false);
        setDeviceSize('desktop');
      }
    } else if (!loadingRef.current) {
      setActiveModal(null);
      setModalRouteError(true);
    }
  }, []);

  const openTemplateModal = (item: PublicTemplateMetadata) => {
    const modalUrl = templateModalUrl(item.slug, 'opened');
    if (!modalUrl) {
      setActiveModal(null);
      setModalRouteError(true);
      return;
    }
    window.history.pushState({ templateSlug: item.slug, modalState: 'opened' }, '', modalUrl);
    setActiveModal(item);
    setModalRouteError(false);
    setViewMode('preview');
    setModalHtml(null);
    setModalHtmlError(false);
    setDeviceSize('desktop');
  };

  const closeTemplateModal = useCallback(() => {
    if (activeModal) {
      const modalUrl = templateModalUrl(activeModal.slug, 'closed');
      if (modalUrl) {
        window.history.replaceState(
          { templateSlug: activeModal.slug, modalState: 'closed' },
          '',
          modalUrl
        );
      }
    }
    setActiveModal(null);
    setModalRouteError(false);
  }, [activeModal]);

  useEffect(() => {
    const handlePopState = () => syncModalFromLocation();
    window.addEventListener('popstate', handlePopState);
    syncModalFromLocation();
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncModalFromLocation]);

  useEffect(() => {
    if (!loading) syncModalFromLocation();
  }, [loading, snippets, syncModalFromLocation]);

  const getTemplateHtml = useCallback(async (slug: string): Promise<string> => {
    const cachedHtml = templateHtmlCache.current.get(slug);
    if (cachedHtml !== undefined) return cachedHtml;

    const pendingRequest = templateHtmlRequests.current.get(slug);
    if (pendingRequest) return pendingRequest;

    const endpoint = rawTemplateUrl(slug);
    const request = (async () => {
      const startedAt = performance.now();
      try {
        const response = await fetch(endpoint);
        recordApiResponse('GET', endpoint, response, startedAt);
        if (!response.ok) throw new Error('Template content request failed');
        const html = await response.text();
        templateHtmlCache.current.set(slug, html);
        return html;
      } catch (error) {
        recordApiFailure('GET', endpoint, error);
        throw error;
      } finally {
        templateHtmlRequests.current.delete(slug);
      }
    })();

    templateHtmlRequests.current.set(slug, request);
    return request;
  }, [recordApiFailure, recordApiResponse]);

  useEffect(() => {
    if (!activeModal || viewMode !== 'preview' || deviceSize !== 'desktop') return;

    const previewViewport = previewViewportRef.current;
    if (!previewViewport) return;

    const updatePreviewScale = () => {
      const availableWidth = Math.max(previewViewport.clientWidth - 16, 0);
      const availableHeight = Math.max(previewViewport.clientHeight - 16, 0);
      setPreviewScale(Math.min(availableWidth / 1440, availableHeight / 900, 1));
    };

    const resizeObserver = new ResizeObserver(updatePreviewScale);
    resizeObserver.observe(previewViewport);
    updatePreviewScale();

    return () => resizeObserver.disconnect();
  }, [activeModal, deviceSize, viewMode]);

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
      const startedAt = performance.now();
      try {
        const res = await fetch('/api/settings');
        const data: any = await res.json();
        recordApiResponse('GET', '/api/settings', res, startedAt);
        if (res.ok && data.success && data.settings) {
          devModeRef.current = Boolean(data.settings.dev_mode);
          if (!devModeRef.current) setDevLogs([]);
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
        } else {
          devModeRef.current = false;
          setDevLogs([]);
        }
      } catch (error) {
        devModeRef.current = false;
        setDevLogs([]);
        recordApiFailure('GET', '/api/settings', error);
      }
    }
    loadSettings();
  }, [recordApiFailure, recordApiResponse]);

  const loadTemplates = useCallback(async () => {
    const startedAt = performance.now();
    setLoading(true);
    try {
      const res = await fetch('/api/templates?metadata=1');
      const data: any = await res.json();
      recordApiResponse('GET', '/api/templates?metadata=1', res, startedAt);
      if (res.ok && data.success) {
        setSnippets(data.items || []);
      } else {
        setSnippets([]);
      }
    } catch (error) {
      recordApiFailure('GET', '/api/templates?metadata=1', error);
      setSnippets([]);
    } finally {
      setLoading(false);
    }
  }, [recordApiFailure, recordApiResponse]);

  useEffect(() => {
    if (!activeModal || viewMode !== 'code' || modalHtml !== null) return;

    let canceled = false;
    setModalHtmlError(false);
    getTemplateHtml(activeModal.slug)
      .then((html) => {
        if (!canceled) setModalHtml(html);
      })
      .catch(() => {
        if (!canceled) setModalHtmlError(true);
      });

    return () => {
      canceled = true;
    };
  }, [activeModal, getTemplateHtml, modalHtml, viewMode]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    const title = activeModal?.title || settings.site_name || 'HTML Snippets & Templates';
    const description = activeModal?.description?.trim() || settings.site_description;
    document.title = title;

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute('content', description);

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', description);
  }, [activeModal?.description, activeModal?.title, settings.site_description, settings.site_name]);

  useEffect(() => {
    if (!settings.dev_mode) return;

    const handleError = (event: ErrorEvent) => {
      let source = 'unavailable';
      if (event.filename) {
        try {
          source = new URL(event.filename, window.location.origin).pathname;
        } catch {
          source = 'unavailable';
        }
      }
      addDevLog('error', 'window.error', {
        message: event.message
          .replace(/(authorization|token|secret|password|api[_-]?key)(\s*[:=]\s*)[^\s,;]+/gi, '$1$2[redacted]')
          .slice(0, 200),
        source,
        line: event.lineno,
      });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const errorName = event.reason instanceof Error ? event.reason.name : typeof event.reason;
      addDevLog('error', 'unhandledrejection', { error: errorName });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [addDevLog, settings.dev_mode]);

  // Categories list derived from real templates
  const categories = useMemo(() => {
    const list = new Set(snippets.map((s) => s.category).filter(Boolean));
    return ['all', '__popular__', ...Array.from(list)];
  }, [snippets]);

  // Filtered snippets
  const filteredSnippets = useMemo(() => {
    const matches = snippets.filter((item) => {
      const isPopular = selectedCategory === '__popular__';
      const matchesCat = selectedCategory === 'all' || isPopular || item.category === selectedCategory;
      const matchesPopularity = !isPopular || item.downloads > 0;
      const matchesSearch =
        !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.slug.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      return matchesCat && matchesPopularity && matchesSearch;
    });

    return selectedCategory === '__popular__'
      ? matches.sort((a, b) => b.downloads - a.downloads)
      : matches;
  }, [snippets, selectedCategory, search]);

  const totalPages = Math.max(1, Math.ceil(filteredSnippets.length / pageSize));
  const pageStartIndex = (currentPage - 1) * pageSize;
  const pageSnippets = filteredSnippets.slice(pageStartIndex, pageStartIndex + pageSize);
  const rangeStart = filteredSnippets.length === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd = Math.min(pageStartIndex + pageSize, filteredSnippets.length);

  const handleDownload = async (item: PublicTemplateMetadata) => {
    try {
      const endpoint = `/api/templates/${encodeURIComponent(item.slug)}/download`;
      const startedAt = performance.now();
      fetch(endpoint, { method: 'POST' })
        .then((response) => recordApiResponse('POST', endpoint, response, startedAt))
        .catch((error) => recordApiFailure('POST', endpoint, error));

      const html = await getTemplateHtml(item.slug);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
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
      showToast('Failed to load template');
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
      if (e.key === 'Escape') closeTemplateModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeTemplateModal]);

  return (
    <div className="public-app min-h-screen bg-[#090a0c] text-zinc-300 flex flex-col font-sans selection:bg-zinc-800 selection:text-zinc-200 antialiased">
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
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer shadow-none border-0 ${
                  selectedCategory === cat
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'
                }`}
              >
                {cat === 'all' ? 'All' : cat === '__popular__' ? 'Popular' : cat}
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
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
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
        ) : modalRouteError ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6 bg-[#121317] border border-zinc-800 rounded-md shadow-none">
            <p className="text-xs text-zinc-400 font-medium">This template link is invalid or unavailable.</p>
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', '/');
                setModalRouteError(false);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 bg-zinc-800 text-zinc-200 rounded text-[11px] font-medium"
            >
              Back to all templates
            </button>
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
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto"
            id="card-grid"
          >
            {pageSnippets.map((item) => (
              <div
                key={item.id}
                className="public-template-card flex flex-col bg-[#1a1a1e] border border-white/10 rounded-[6px] overflow-hidden transition-all duration-200 hover:border-white/20 hover:shadow-xl hover:shadow-black/50"
              >
                {/* HTML Preview Frame */}
                <div className="relative w-full aspect-[4/3] bg-[#eef2f6] p-2 flex items-center justify-center border-b border-white/5 overflow-hidden">
                  <iframe
                    title={item.title}
                    src={rawTemplateUrl(item.slug)}
                    loading="lazy"
                    onLoad={(event) => {
                      event.currentTarget.parentElement
                        ?.querySelector('[data-preview-loader]')
                        ?.setAttribute('hidden', '');
                    }}
                    sandbox="allow-scripts"
                    className="absolute left-0 top-0 w-[400%] h-[400%] max-w-none border-0 pointer-events-none scale-[0.25] origin-top-left"
                  />
                  <div
                    data-preview-loader
                    role="status"
                    aria-live="polite"
                    className="absolute inset-2 z-10 flex items-center justify-center bg-[#eef2f6]/90 text-zinc-500"
                  >
                    <span className="flex items-center gap-2 text-[11px] font-medium">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading preview...
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-transparent" />

                  <div className="badge absolute top-2.5 left-2.5 z-20 bg-black/60 backdrop-blur-md text-zinc-300 text-[10px] font-medium px-2 py-1 rounded-[4px] tracking-wide pointer-events-none">
                      {item.category}
                  </div>

                  <div className="badge absolute top-2.5 right-2.5 z-20 bg-black/60 backdrop-blur-md text-zinc-300 text-[10px] font-medium px-2 py-1 rounded-[4px] tracking-wide pointer-events-none">
                      {(item.file_size / 1024).toFixed(1)} KB
                  </div>
                </div>

                <div className="p-3.5 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className="text-[13px] font-medium text-zinc-300 truncate tracking-wide"
                      title={item.title}
                    >
                      {item.title}
                    </h3>
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                      <Download className="w-3.5 h-3.5" />
                      <span>{item.downloads}</span>
                    </span>
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => openTemplateModal(item)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-[4px] border border-transparent bg-white/[0.04] px-2 py-1.5 text-[11px] font-medium text-zinc-400 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.08] hover:text-zinc-200 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    <button
                      onClick={() => handleDownload(item)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-[4px] border border-transparent bg-white/[0.04] px-2 py-1.5 text-[11px] font-medium text-zinc-400 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.08] hover:text-zinc-200 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          handleCopyCode(await getTemplateHtml(item.slug));
                        } catch {
                          showToast('Failed to load HTML');
                        }
                      }}
                      className="flex items-center justify-center rounded-[4px] border border-transparent bg-white/[0.04] p-1.5 text-zinc-400 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.08] hover:text-zinc-200 cursor-pointer"
                      title="Copy HTML"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredSnippets.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 text-[11px] text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
            <span>Showing {rangeStart}-{rangeEnd} of {filteredSnippets.length}</span>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <label htmlFor="template-page-size">Per page</label>
              <select
                id="template-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="h-7 rounded border border-zinc-800 bg-[#131418] px-2 text-[11px] text-zinc-300"
              >
                {TEMPLATE_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                title="Previous page"
                className="flex h-7 w-7 items-center justify-center rounded border border-zinc-800 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-16 text-center">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                title="Next page"
                className="flex h-7 w-7 items-center justify-center rounded border border-zinc-800 text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
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
                    onClick={async () => {
                      try {
                        handleCopyCode(modalHtml ?? await getTemplateHtml(activeModal.slug));
                      } catch {
                        showToast('Failed to load HTML');
                      }
                    }}
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
                  onClick={closeTemplateModal}
                  className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer shadow-none border-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div ref={previewViewportRef} className="flex-1 bg-[#0b0c0e] relative overflow-hidden flex items-center justify-center p-2">
              {viewMode === 'preview' ? (
                <div
                  className={`bg-[#0b0c0e] transition-all duration-200 overflow-hidden border border-zinc-800 rounded shadow-none ${
                    deviceSize === 'desktop'
                      ? 'absolute left-1/2 top-1/2 w-[1440px] h-[900px] origin-center'
                      : `h-full ${deviceSize === 'mobile' ? 'w-[375px]' : 'w-[768px]'}`
                  }`}
                  style={deviceSize === 'desktop' ? { transform: `translate(-50%, -50%) scale(${previewScale})` } : undefined}
                >
                  <iframe
                    title="Modal Preview"
                    src={rawTemplateUrl(activeModal.slug, true)}
                    sandbox="allow-scripts allow-modals"
                    className="w-full h-full border-0 shadow-none"
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-[#0b0c0e] p-3.5 overflow-auto shadow-none">
                  <pre className="text-zinc-300 font-mono text-[11px] leading-relaxed selection:bg-zinc-800">
                    {modalHtmlError ? 'Unable to load HTML. Switch to Preview and try again.' : modalHtml ?? 'Loading HTML...'}
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
      {settings.dev_mode && <DevLogPanel logs={devLogs} onClear={() => setDevLogs([])} />}
    </div>
  );
};
