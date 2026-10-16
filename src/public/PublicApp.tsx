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
  Menu,
  Layers,
} from 'lucide-react';
import { Category, PublicTemplateMetadata, SiteSettings } from '../types.ts';
import { getCategorySeoMetadata, getHomeSeoMetadata, getTemplateSeoMetadata } from '../lib/seo.ts';
import { installSiteScripts } from '../lib/siteScripts.ts';
import { DevLogEntry, DevLogPanel } from './DevLogPanel.tsx';

const rawTemplateUrl = (slug: string, hideScrollbars = false) =>
  `/api/templates/${encodeURIComponent(slug)}/raw${hideScrollbars ? '?hide_scrollbars=1' : ''}`;
const assignPreviewTextIds = (previewDocument: Document) => {
  const targets = new Set<Element>();
  const walker = previewDocument.createTreeWalker(previewDocument.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue;
    const target = node.parentElement;
    if (
      !target ||
      target.closest('script,style,textarea,input,select,option,svg,canvas,[contenteditable],[aria-hidden="true"]')
    ) continue;
    targets.add(target);
  }

  targets.forEach((target, index) => target.setAttribute('data-vib-editor-id', String(index)));
};
type PreviewTextEdit = {
  shape: string[];
  textNodes: Array<{ index: number; text: string }>;
};
const getPreviewNodeShape = (target: Element) => Array.from(target.childNodes).map((node) => {
  if (node.nodeType === Node.ELEMENT_NODE) return `element:${(node as Element).tagName}`;
  if (node.nodeType === Node.TEXT_NODE) return 'text';
  if (node.nodeType === Node.COMMENT_NODE) return 'comment';
  return `node:${node.nodeType}`;
});
const applyPreviewTextEdits = (html: string, edits: Record<string, PreviewTextEdit>) => {
  const editedDocument = new DOMParser().parseFromString(html, 'text/html');
  assignPreviewTextIds(editedDocument);
  Object.entries(edits).forEach(([id, edit]) => {
    const target = editedDocument.querySelector(`[data-vib-editor-id="${id}"]`);
    if (!target) return;
    const originalShape = getPreviewNodeShape(target);
    if (originalShape.length !== edit.shape.length || originalShape.some((node, index) => node !== edit.shape[index])) return;
    edit.textNodes.forEach(({ index, text }) => {
      const node = target.childNodes[index];
      if (node?.nodeType === Node.TEXT_NODE) node.textContent = text;
    });
  });
  editedDocument.querySelectorAll('[data-vib-editor-id]').forEach((target) => {
    target.removeAttribute('data-vib-editor-id');
  });
  const doctype = editedDocument.doctype?.name || 'html';
  return `<!DOCTYPE ${doctype}>\n${editedDocument.documentElement.outerHTML}`;
};
const createModalPreviewDocument = (html: string, slug: string) => {
  const previewDocument = new DOMParser().parseFromString(html, 'text/html');
  assignPreviewTextIds(previewDocument);
  if (!previewDocument.head.querySelector('base[href]')) {
    const base = previewDocument.createElement('base');
    base.href = new URL(rawTemplateUrl(slug), window.location.origin).href;
    base.dataset.vibEditorInjected = 'base';
    previewDocument.head.prepend(base);
  }

  const scrollbarStyle = previewDocument.createElement('style');
  scrollbarStyle.dataset.vibEditorInjected = 'scrollbars';
  scrollbarStyle.textContent = 'html,body,*{scrollbar-width:none!important;-ms-overflow-style:none!important}html::-webkit-scrollbar,body::-webkit-scrollbar,*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}';
  previewDocument.head.append(scrollbarStyle);

  const editorScript = previewDocument.createElement('script');
  editorScript.dataset.vibEditorInjected = 'bootstrap';
  editorScript.textContent = `(function () {
    const blockedSelector = 'script,style,textarea,input,select,option,svg,canvas,[contenteditable]:not([data-vib-editor-target]),[aria-hidden="true"]';
    const setEditable = (enabled) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const targets = new Set();
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const target = node.parentElement;
        if (!target || !target.hasAttribute('data-vib-editor-id') || target.closest(blockedSelector) || target.getClientRects().length === 0) continue;
        let ancestor = target;
        let visible = true;
        while (ancestor) {
          const style = window.getComputedStyle(ancestor);
          if (ancestor.hidden || style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) {
            visible = false;
            break;
          }
          ancestor = ancestor.parentElement;
        }
        if (!visible) continue;
        targets.add(target);
      }
      targets.forEach((target) => {
        target.dataset.vibEditorTarget = 'true';
        target.contentEditable = enabled ? 'plaintext-only' : 'false';
      });
    };

    const getNodeShape = (target) => Array.from(target.childNodes).map((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) return 'element:' + node.tagName;
      if (node.nodeType === Node.TEXT_NODE) return 'text';
      if (node.nodeType === Node.COMMENT_NODE) return 'comment';
      return 'node:' + node.nodeType;
    });

    const editedTexts = new Map();
    const publishEditedText = (target) => {
      const id = target.getAttribute('data-vib-editor-id');
      if (id === null) return;
      const textNodes = Array.from(target.childNodes)
        .map((node, index) => node.nodeType === Node.TEXT_NODE ? { index, text: node.textContent || '' } : null)
        .filter((entry) => entry !== null);
      editedTexts.set(id, { shape: getNodeShape(target), textNodes });
      window.parent.postMessage({
        type: 'public-preview-text-edits',
        edits: Array.from(editedTexts, ([editedId, edit]) => ({ id: editedId, ...edit })),
      }, '*');
    };

    setEditable(true);
    window.addEventListener('message', (event) => {
      if (event.source !== parent || event.data?.type !== 'public-preview-editable') return;
      setEditable(event.data.enabled === true);
    });
    document.addEventListener('input', (event) => {
      if (!(event.target instanceof Element) || event.target.closest('input,textarea,select,option')) return;
      const target = event.target.closest('[data-vib-editor-target]');
      if (target) publishEditedText(target);
    }, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target instanceof Element && event.target.closest('[data-vib-editor-target]')) {
        event.preventDefault();
      }
    }, true);
  })();`;
  previewDocument.body.append(editorScript);

  const doctype = previewDocument.doctype?.name || 'html';
  return `<!DOCTYPE ${doctype}>\n${previewDocument.documentElement.outerHTML}`;
};
const templateModalUrl = (slug: string, state: 'opened' | 'closed'): string | null => {
  const pathname = `/${encodeURIComponent(slug)}`;
  const normalizedPathname = new URL(pathname, window.location.origin).pathname;
  if (normalizedPathname !== pathname || normalizedPathname.split('/').filter(Boolean).length !== 1) return null;
  return `${pathname}?${state}`;
};
const TEMPLATE_PAGE_SIZES = [12, 24, 48];
const CANONICAL_ORIGIN = 'https://html.vibid.my';
const DEFAULT_SITE_DESCRIPTION = 'Browse free HTML templates and responsive website components. Preview designs, inspect source code, and download HTML snippets to customize for your project.';
type CatalogView = 'all' | 'popular' | 'category';
interface CatalogRouteContext {
  view: CatalogView;
  categorySlug?: string;
  page: number;
  pageSize: number;
}

const catalogRouteUrl = ({ view, categorySlug, page, pageSize }: CatalogRouteContext): string => {
  const pathname = view === 'popular'
    ? '/popular'
    : view === 'category' && categorySlug
    ? `/categories/${encodeURIComponent(categorySlug)}`
    : '/';
  const params = new URLSearchParams();
  if (page > 1) params.set('page', String(page));
  if (pageSize !== TEMPLATE_PAGE_SIZES[0]) params.set('size', String(pageSize));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};

const templateRouteUrl = (slug: string, context: CatalogRouteContext): string | null => {
  const pathname = `/templates/${encodeURIComponent(slug)}`;
  const normalizedPathname = new URL(pathname, window.location.origin).pathname;
  if (normalizedPathname !== pathname || normalizedPathname.split('/').filter(Boolean).length !== 2) return null;
  const params = new URLSearchParams();
  if (context.view === 'popular') params.set('view', 'popular');
  if (context.view === 'category' && context.categorySlug) params.set('category', context.categorySlug);
  if (context.page > 1) params.set('page', String(context.page));
  if (context.pageSize !== TEMPLATE_PAGE_SIZES[0]) params.set('size', String(context.pageSize));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};

export const PublicApp: React.FC = () => {
  const [snippets, setSnippets] = useState<PublicTemplateMetadata[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [templateLoadError, setTemplateLoadError] = useState(false);
  const [publicCategories, setPublicCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesLoadError, setCategoriesLoadError] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: 'Free HTML Templates',
    site_description: DEFAULT_SITE_DESCRIPTION,
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    header_scripts: '',
    footer_scripts: '',
    app_logo: '',
    favicon_url: '',
    og_image: '',
    dev_mode: false,
  });

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
  const [modalPreviewError, setModalPreviewError] = useState(false);
  const [categoryRouteError, setCategoryRouteError] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [modalHtml, setModalHtml] = useState<string | null>(null);
  const [modalHtmlError, setModalHtmlError] = useState(false);
  const [modalPreviewHtml, setModalPreviewHtml] = useState<string | null>(null);
  const [modalTextEdits, setModalTextEdits] = useState<Record<string, PreviewTextEdit>>({});
  const [modalPreviewRenderHtml, setModalPreviewRenderHtml] = useState<string | null>(null);
  const [modalPreviewLoading, setModalPreviewLoading] = useState(false);
  const [previewEditable, setPreviewEditable] = useState(true);
  const [deviceSize, setDeviceSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const modalPreviewFrameRef = useRef<HTMLIFrameElement>(null);
  const [previewScale, setPreviewScale] = useState(0.5);
  const modalPreviewSrcDoc = useMemo(() => {
    if (!activeModal || modalPreviewRenderHtml === null) return undefined;
    return createModalPreviewDocument(modalPreviewRenderHtml, activeModal.slug);
  }, [activeModal?.slug, modalPreviewRenderHtml]);
  const modalEditedHtml = useMemo(() => {
    if (modalPreviewHtml === null || Object.keys(modalTextEdits).length === 0) return null;
    return applyPreviewTextEdits(modalPreviewHtml, modalTextEdits);
  }, [modalPreviewHtml, modalTextEdits]);
  const templateHtmlCache = useRef(new Map<string, string>());
  const templateHtmlRequests = useRef(new Map<string, Promise<string>>());
  const snippetsRef = useRef(snippets);
  const loadingRef = useRef(loading);
  const activeModalRef = useRef(activeModal);
  const categoriesRef = useRef(publicCategories);
  const modalContextRef = useRef<{ context: CatalogRouteContext; legacy: boolean } | null>(null);
  const lastResolvedLocationRef = useRef<string | null>(null);
  snippetsRef.current = snippets;
  loadingRef.current = loading;
  activeModalRef.current = activeModal;
  categoriesRef.current = publicCategories;

  const trackActivity = useCallback((event: 'category_view' | 'template_open', slug: string) => {
    const endpoint = '/api/activity';
    const startedAt = performance.now();
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, slug }),
    })
      .then((response) => recordApiResponse('POST', endpoint, response, startedAt))
      .catch((error) => recordApiFailure('POST', endpoint, error));
  }, [recordApiFailure, recordApiResponse]);

  const catalogContext = (category: string, page: number, size: number): CatalogRouteContext => {
    if (category === '__popular__') return { view: 'popular', page, pageSize: size };
    if (category === 'all') return { view: 'all', page, pageSize: size };
    const match = publicCategories.find((item) => item.name === category && item.status === 'active');
    return match
      ? { view: 'category', categorySlug: match.slug, page, pageSize: size }
      : { view: 'all', page: 1, pageSize: size };
  };

  const syncRouteFromLocation = useCallback(() => {
    if (loadingRef.current || categoriesLoading) return;
    const url = new URL(window.location.href);
    const locationKey = `${url.pathname}${url.search}`;
    const shouldTrack = lastResolvedLocationRef.current !== locationKey;
    lastResolvedLocationRef.current = locationKey;

    const pageValue = Number(url.searchParams.get('page'));
    const page = Number.isSafeInteger(pageValue) && pageValue > 0 && pageValue <= 10_000 ? pageValue : 1;
    const requestedSize = Number(url.searchParams.get('size'));
    const size = TEMPLATE_PAGE_SIZES.includes(requestedSize) ? requestedSize : TEMPLATE_PAGE_SIZES[0];
    const segments = url.pathname.split('/').filter(Boolean);
    const opened = url.searchParams.has('opened');
    const closed = url.searchParams.has('closed');
    let context: CatalogRouteContext = { view: 'all', page, pageSize: size };
    let templateSlug: string | null = null;
    let legacyTemplateRoute = false;
    let invalidTemplateRoute = false;
    let invalidCategoryRoute = false;

    if (opened && closed) {
      invalidTemplateRoute = true;
    } else if (url.pathname === '/popular') {
      context = { view: 'popular', page, pageSize: size };
    } else if (segments[0] === 'categories') {
      if (segments.length !== 2) {
        invalidCategoryRoute = true;
      } else {
        try {
          const slug = decodeURIComponent(segments[1]);
          const category = publicCategories.find((item) => item.slug === slug && item.status === 'active');
          if (category) context = { view: 'category', categorySlug: category.slug, page, pageSize: size };
          else invalidCategoryRoute = true;
        } catch {
          invalidCategoryRoute = true;
        }
      }
    } else if (segments[0] === 'templates') {
      if (segments.length !== 2) {
        invalidTemplateRoute = true;
      } else {
        try {
          templateSlug = decodeURIComponent(segments[1]);
          if (url.searchParams.get('view') === 'popular' && url.searchParams.has('category')) {
            invalidCategoryRoute = true;
          } else if (url.searchParams.get('view') === 'popular') {
            context = { view: 'popular', page, pageSize: size };
          } else if (url.searchParams.has('category')) {
            const slug = url.searchParams.get('category') || '';
            const category = publicCategories.find((item) => item.slug === slug && item.status === 'active');
            if (category) context = { view: 'category', categorySlug: category.slug, page, pageSize: size };
            else invalidCategoryRoute = true;
          }
        } catch {
          invalidTemplateRoute = true;
        }
      }
    } else if (opened) {
      if (segments.length !== 1) invalidTemplateRoute = true;
      else {
        try {
          templateSlug = decodeURIComponent(segments[0]);
          legacyTemplateRoute = true;
        } catch {
          invalidTemplateRoute = true;
        }
      }
    } else if (segments.length > 1) {
      invalidTemplateRoute = true;
    }

    if (invalidTemplateRoute || invalidCategoryRoute) {
      setActiveModal(null);
      setModalRouteError(invalidTemplateRoute);
      setCategoryRouteError(invalidCategoryRoute);
      return;
    }

    setCategoryRouteError(false);
    setModalRouteError(false);
    setSelectedCategory(context.view === 'popular'
      ? '__popular__'
      : context.view === 'category'
      ? publicCategories.find((item) => item.slug === context.categorySlug)?.name || 'all'
      : 'all');
    setCurrentPage(page);
    setPageSize(size);

    if (!templateSlug) {
      modalContextRef.current = null;
      setActiveModal(null);
      return;
    }

    const template = snippetsRef.current.find((item) => item.slug === templateSlug);
    if (!template) {
      setActiveModal(null);
      setModalRouteError(true);
      return;
    }

    modalContextRef.current = { context, legacy: legacyTemplateRoute };
    if (shouldTrack) trackActivity('template_open', template.slug);
    if (activeModalRef.current?.slug !== template.slug) {
      setActiveModal(template);
      setModalPreviewError(false);
      setViewMode('preview');
      setModalHtml(null);
      setModalHtmlError(false);
      setModalPreviewHtml(null);
      setModalTextEdits({});
      setModalPreviewRenderHtml(null);
      setModalPreviewLoading(true);
      setPreviewEditable(true);
      setDeviceSize('desktop');
    }
  }, [categoriesLoading, publicCategories, trackActivity]);

  const openTemplateModal = (item: PublicTemplateMetadata) => {
    const context = catalogContext(selectedCategory, currentPage, pageSize);
    const modalUrl = templateRouteUrl(item.slug, context);
    if (!modalUrl) {
      setActiveModal(null);
      setModalRouteError(true);
      return;
    }
    window.history.pushState({ templateSlug: item.slug, modalState: 'opened' }, '', modalUrl);
    lastResolvedLocationRef.current = `${window.location.pathname}${window.location.search}`;
    modalContextRef.current = { context, legacy: false };
    setActiveModal(item);
    trackActivity('template_open', item.slug);
    setModalPreviewError(false);
    setModalRouteError(false);
    setCategoryRouteError(false);
    setViewMode('preview');
    setModalHtml(null);
    setModalHtmlError(false);
    setModalPreviewHtml(null);
    setModalTextEdits({});
    setModalPreviewRenderHtml(null);
    setModalPreviewLoading(true);
    setPreviewEditable(true);
    setDeviceSize('desktop');
  };

  const closeTemplateModal = useCallback(() => {
    if (activeModal) {
      const modalContext = modalContextRef.current;
      if (modalContext?.legacy) {
        const legacyUrl = templateModalUrl(activeModal.slug, 'closed');
        if (legacyUrl) window.history.replaceState({ templateSlug: activeModal.slug, modalState: 'closed' }, '', legacyUrl);
      } else if (modalContext) {
        const destination = catalogRouteUrl(modalContext.context);
        window.history.replaceState({ catalogRoute: true }, '', destination);
        lastResolvedLocationRef.current = `${window.location.pathname}${window.location.search}`;
        setSelectedCategory(modalContext.context.view === 'popular'
          ? '__popular__'
          : modalContext.context.view === 'category'
          ? publicCategories.find((item) => item.slug === modalContext.context.categorySlug)?.name || 'all'
          : 'all');
        setCurrentPage(modalContext.context.page);
        setPageSize(modalContext.context.pageSize);
        if (modalContext.context.view === 'category' && modalContext.context.categorySlug) {
          trackActivity('category_view', modalContext.context.categorySlug);
        }
      }
    }
    modalContextRef.current = null;
    setActiveModal(null);
    setModalRouteError(false);
    setCategoryRouteError(false);
    setModalPreviewHtml(null);
    setModalTextEdits({});
    setModalPreviewRenderHtml(null);
    setModalPreviewLoading(false);
    setPreviewEditable(true);
  }, [activeModal, publicCategories, trackActivity]);

  useEffect(() => {
    const handlePopState = () => syncRouteFromLocation();
    window.addEventListener('popstate', handlePopState);
    syncRouteFromLocation();
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncRouteFromLocation]);

  useEffect(() => {
    syncRouteFromLocation();
  }, [loading, categoriesLoading, snippets, publicCategories, syncRouteFromLocation]);

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
    if (!activeModal || viewMode !== 'preview' || modalPreviewHtml !== null || modalPreviewError) return;

    let canceled = false;
    setModalPreviewLoading(true);
    getTemplateHtml(activeModal.slug)
      .then((html) => {
        if (!canceled) {
          setModalPreviewHtml(html);
          setModalPreviewRenderHtml(html);
        }
      })
      .catch(() => {
        if (!canceled) {
          setModalPreviewError(true);
          setModalPreviewLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [activeModal, getTemplateHtml, modalPreviewError, modalPreviewHtml, viewMode]);

  useEffect(() => {
    if (viewMode !== 'preview' || modalPreviewHtml === null) return;
    modalPreviewFrameRef.current?.contentWindow?.postMessage({
      type: 'public-preview-editable',
      enabled: previewEditable,
    }, '*');
  }, [modalPreviewHtml, previewEditable, viewMode]);

  useEffect(() => {
    if (!activeModal) return;

    const handlePreviewHtmlMessage = (event: MessageEvent) => {
      if (event.source !== modalPreviewFrameRef.current?.contentWindow) return;
      const message = event.data as { type?: unknown; edits?: unknown } | null;
      if (message?.type !== 'public-preview-text-edits' || !Array.isArray(message.edits)) return;
      const edits = message.edits.filter((item): item is { id: string; shape: string[]; textNodes: Array<{ index: number; text: string }> } => {
        if (!item || typeof item !== 'object') return false;
        const edit = item as { id?: unknown; shape?: unknown; textNodes?: unknown };
        if (typeof edit.id !== 'string' || !/^\d+$/.test(edit.id) || !Array.isArray(edit.shape) || !Array.isArray(edit.textNodes)) return false;
        if (!edit.shape.every((entry) => typeof entry === 'string')) return false;
        return edit.textNodes.every((node) => {
          if (!node || typeof node !== 'object') return false;
          const textNode = node as { index?: unknown; text?: unknown };
          return Number.isInteger(textNode.index) && Number(textNode.index) >= 0 && typeof textNode.text === 'string';
        });
      });
      if (edits.length === 0) return;
      setModalTextEdits((current) => {
        const updated = { ...current };
        edits.forEach(({ id, textNodes }) => {
          updated[id] = textNodes;
        });
        return updated;
      });
    };

    window.addEventListener('message', handlePreviewHtmlMessage);
    return () => window.removeEventListener('message', handlePreviewHtmlMessage);
  }, [activeModal?.slug]);

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
          setSettings({
            ...data.settings,
            header_scripts: typeof data.settings.header_scripts === 'string' ? data.settings.header_scripts : '',
            footer_scripts: typeof data.settings.footer_scripts === 'string' ? data.settings.footer_scripts : '',
          });

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

  useEffect(() => installSiteScripts(settings.header_scripts, settings.footer_scripts), [settings.footer_scripts, settings.header_scripts]);

  const loadTemplates = useCallback(async () => {
    const startedAt = performance.now();
    setLoading(true);
    setTemplateLoadError(false);
    try {
      const res = await fetch('/api/templates?metadata=1');
      const data: any = await res.json();
      recordApiResponse('GET', '/api/templates?metadata=1', res, startedAt);
      if (res.ok && data.success && Array.isArray(data.items)) {
        setSnippets(data.items);
      } else {
        setSnippets([]);
        setTemplateLoadError(true);
      }
    } catch (error) {
      recordApiFailure('GET', '/api/templates?metadata=1', error);
      setSnippets([]);
      setTemplateLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [recordApiFailure, recordApiResponse]);

  const loadCategories = useCallback(async () => {
    const startedAt = performance.now();
    setCategoriesLoading(true);
    setCategoriesLoadError(false);
    try {
      const response = await fetch('/api/categories');
      const data: any = await response.json();
      recordApiResponse('GET', '/api/categories', response, startedAt);
      if (response.ok && data.success && Array.isArray(data.items)) {
        setPublicCategories(data.items);
      } else {
        setPublicCategories([]);
        setCategoriesLoadError(true);
      }
    } catch (error) {
      recordApiFailure('GET', '/api/categories', error);
      setPublicCategories([]);
      setCategoriesLoadError(true);
    } finally {
      setCategoriesLoading(false);
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
    loadCategories();
  }, [loadCategories, loadTemplates]);

  useEffect(() => {
    const activeCategory = selectedCategory !== 'all' && selectedCategory !== '__popular__'
      ? publicCategories.find((item) => item.name === selectedCategory && item.status === 'active')
      : undefined;
    const metadata = activeModal
      ? getTemplateSeoMetadata(activeModal)
      : activeCategory
      ? getCategorySeoMetadata(activeCategory)
      : getHomeSeoMetadata(settings);
    const pathname = window.location.pathname;
    let canonicalPath = '/';
    if (activeModal) {
      const encodedSlug = encodeURIComponent(activeModal.slug);
      const templatePath = `/templates/${encodedSlug}`;
      const legacyPath = `/${encodedSlug}`;
      if (pathname === templatePath || ((pathname === legacyPath) && (window.location.search.includes('opened') || window.location.search.includes('closed')))) {
        canonicalPath = templatePath;
      }
    } else if (pathname === '/popular') {
      canonicalPath = '/popular';
    } else if (pathname.startsWith('/categories/')) {
      const category = publicCategories.find((item) => `/categories/${encodeURIComponent(item.slug)}` === pathname);
      if (category) canonicalPath = pathname;
    }
    const canonicalUrl = `${CANONICAL_ORIGIN}${canonicalPath}`;
    const socialImage = settings.og_image || `${CANONICAL_ORIGIN}/og-image.svg`;
    document.title = metadata.title;

    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', canonicalUrl);
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', metadata.description);
    document.querySelector<HTMLMetaElement>('meta[name="keywords"]')?.setAttribute('content', metadata.keywords);
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', metadata.title);
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', metadata.description);
    document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', canonicalUrl);
    document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.setAttribute('content', socialImage);
    document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute('content', metadata.title);
    document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.setAttribute('content', metadata.description);
    document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')?.setAttribute('content', socialImage);
  }, [activeModal, publicCategories, selectedCategory, settings, settings.og_image]);

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

  const categories = useMemo(() => {
    return ['all', '__popular__', ...publicCategories.map((category) => category.name)];
  }, [publicCategories]);

  const writeCatalogRoute = (category: string, page: number, size: number, replace = true) => {
    const context = catalogContext(category, page, size);
    const destination = catalogRouteUrl(context);
    if (replace) window.history.replaceState({ catalogRoute: true }, '', destination);
    else window.history.pushState({ catalogRoute: true }, '', destination);
  };

  const selectCategory = (category: string) => {
    const context = catalogContext(category, 1, pageSize);
    const destination = catalogRouteUrl(context);
    window.history.pushState({ catalogRoute: true }, '', destination);
    lastResolvedLocationRef.current = `${window.location.pathname}${window.location.search}`;
    setSelectedCategory(category);
    setCurrentPage(1);
    setMobileNavOpen(false);
    setModalRouteError(false);
    setCategoryRouteError(false);
    if (context.view === 'category' && context.categorySlug) {
      trackActivity('category_view', context.categorySlug);
    }
  };

  const changePage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
    writeCatalogRoute(selectedCategory, nextPage, pageSize);
  };

  const changePageSize = (size: number) => {
    const nextSize = TEMPLATE_PAGE_SIZES.includes(size) ? size : TEMPLATE_PAGE_SIZES[0];
    setPageSize(nextSize);
    setCurrentPage(1);
    writeCatalogRoute(selectedCategory, 1, nextSize);
  };

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

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      writeCatalogRoute(selectedCategory, totalPages, pageSize);
    }
  }, [currentPage, pageSize, selectedCategory, totalPages]);

  const handleDownload = async (item: PublicTemplateMetadata, editedHtml?: string | null) => {
    try {
      const endpoint = `/api/templates/${encodeURIComponent(item.slug)}/download`;
      const isEditedDownload = typeof editedHtml === 'string';
      const html = isEditedDownload ? editedHtml : await getTemplateHtml(item.slug);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.slug || 'snippet'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Download started');
      if (!isEditedDownload) {
        const counterStartedAt = performance.now();
        fetch(endpoint, { method: 'POST' })
          .then(async (response) => {
            recordApiResponse('POST', endpoint, response, counterStartedAt);
            const data: any = await response.json();
            if (response.ok && data.success && Number.isFinite(Number(data.downloads))) {
              setSnippets((current) => current.map((snippet) =>
                snippet.id === item.id ? { ...snippet, downloads: Number(data.downloads) } : snippet
              ));
            }
          })
          .catch((error) => recordApiFailure('POST', endpoint, error));
      }
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
      <header className="sticky top-0 z-30 flex shrink-0 flex-col gap-2 border-b border-zinc-800/90 bg-[#0f1013] px-3 py-2.5 sm:px-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center justify-between gap-3 md:flex-1">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex min-w-0 items-center space-x-2">
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
            <h1 className="truncate text-xs font-semibold tracking-tight uppercase text-zinc-200">
              {activeModal?.title || 'Free HTML Templates'}
            </h1>
            </div>

            <nav aria-label="Catalog categories" className="hidden items-center space-x-1 pl-3 text-[11px] md:flex">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => selectCategory(cat)}
                  aria-pressed={selectedCategory === cat}
                  className={`whitespace-nowrap rounded px-2.5 py-1 text-[11px] font-medium transition cursor-pointer shadow-none border-0 ${
                    selectedCategory === cat
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850/60'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat === '__popular__' ? 'Popular' : cat}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded border border-zinc-800 bg-[#131418] px-2 py-1 font-mono text-[10px] text-zinc-400 sm:hidden">
              {snippets.length}
            </span>
            <button
              type="button"
              aria-label={mobileNavOpen ? 'Close category navigation' : 'Open category navigation'}
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-category-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center rounded border border-zinc-800 bg-[#131418] text-zinc-300 transition hover:bg-zinc-800 md:hidden"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 md:w-auto">
          {/* Search input */}
          <div className="relative min-w-0 flex-1 md:w-48 md:flex-none">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
                writeCatalogRoute(selectedCategory, 1, pageSize);
              }}
              className="h-8 w-full rounded border border-zinc-800 bg-[#131418] py-1 pl-8 pr-3 text-xs text-zinc-200 placeholder-zinc-500 transition focus:outline-none focus:border-zinc-700 shadow-none"
            />
          </div>

          {/* Item count badge */}
          <div className="hidden shrink-0 rounded border border-zinc-800 bg-[#131418] px-2.5 py-1 font-mono text-[11px] text-zinc-400 shadow-none md:block">
            {snippets.length} Items
          </div>
        </div>

        {mobileNavOpen && (
          <nav
            id="mobile-category-navigation"
            aria-label="Catalog categories"
            className="flex gap-1 overflow-x-auto border-t border-zinc-800/80 pt-2 md:hidden"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => selectCategory(cat)}
                aria-pressed={selectedCategory === cat}
                className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1.5 text-[11px] font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-850/60 hover:text-zinc-200'
                }`}
              >
                {cat === 'all' ? 'All' : cat === '__popular__' ? 'Popular' : cat}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto p-3.5 sm:px-8 sm:py-5 lg:px-10 overflow-y-auto">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-xs text-zinc-500 font-mono">
            Loading snippets...
          </div>
        ) : modalRouteError || categoryRouteError ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6 bg-[#121317] border border-zinc-800 rounded-md shadow-none">
            <p className="text-xs text-zinc-400 font-medium">
              {categoryRouteError ? 'This category link is invalid or unavailable.' : 'This template link is invalid or unavailable.'}
            </p>
            <button
              type="button"
              onClick={() => {
                window.history.pushState({}, '', '/');
                setModalRouteError(false);
                setCategoryRouteError(false);
                setSelectedCategory('all');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 bg-zinc-800 text-zinc-200 rounded text-[11px] font-medium"
            >
              Back to all templates
            </button>
          </div>
        ) : templateLoadError ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6 bg-[#121317] border border-zinc-800 rounded-md shadow-none">
            <p className="text-xs text-zinc-400 font-medium">Unable to load templates.</p>
            <button
              type="button"
              onClick={() => void loadTemplates()}
              className="px-2.5 py-1 bg-zinc-800 text-zinc-200 rounded text-[11px] font-medium"
            >
              Retry
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
                    onError={(event) => {
                      const loader = event.currentTarget.parentElement?.querySelector<HTMLElement>('[data-preview-loader]');
                      if (!loader) return;
                      loader.removeAttribute('hidden');
                      loader.querySelector('svg')?.remove();
                      const message = loader.querySelector('span');
                      if (message) message.textContent = 'Preview unavailable';
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
                onChange={(event) => changePageSize(Number(event.target.value))}
                className="h-7 rounded border border-zinc-800 bg-[#131418] px-2 text-[11px] text-zinc-300"
              >
                {TEMPLATE_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => changePage(currentPage - 1)}
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
                onClick={() => changePage(currentPage + 1)}
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

        {activeModal && (
          <section aria-labelledby="template-detail-heading" className="mx-auto mt-8 max-w-3xl border-t border-zinc-800/80 pt-6 text-sm leading-6 text-zinc-400">
            <h2 id="template-detail-heading" className="text-base font-semibold text-zinc-200">About {activeModal.title}</h2>
            <p className="mt-2">{getTemplateSeoMetadata(activeModal).description}</p>
            <p className="mt-2">Preview the component at different screen sizes, inspect its HTML, and test the downloaded file in your project before publishing.</p>
            <nav aria-label="Related template pages" className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {publicCategories.find((item) => item.name.toLowerCase() === activeModal.category.toLowerCase()) && (
                <a
                  href={`/categories/${encodeURIComponent(publicCategories.find((item) => item.name.toLowerCase() === activeModal.category.toLowerCase())!.slug)}`}
                  className="text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
                >
                  Browse {activeModal.category} templates
                </a>
              )}
              <a href="/" className="text-emerald-400 underline underline-offset-4 hover:text-emerald-300">Browse all HTML templates</a>
            </nav>
          </section>
        )}

        <section aria-labelledby="guide-heading" className="mx-auto mt-12 max-w-3xl border-t border-zinc-800/80 pt-8 text-sm leading-6 text-zinc-400">
          <article>
            <h2 id="guide-heading" className="text-base font-semibold text-zinc-200">Browse, preview, and download HTML templates</h2>
            <p className="mt-2">Find free HTML templates and website components by name, tag, or category. Preview a design, inspect its HTML, then copy the source or download a file to customize in your own editor.</p>
          </article>

          <article className="mt-7">
            <h2 className="text-sm font-semibold text-zinc-200">How it works</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Search template names and tags, or browse a category.</li>
              <li>Open a template to preview it or inspect its HTML source.</li>
              <li>Copy the code or download the HTML file and adapt it to your project.</li>
            </ol>
          </article>

          <article className="mt-7">
            <h2 className="text-sm font-semibold text-zinc-200">Built for quick evaluation</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Searchable catalog with category and popularity browsing.</li>
              <li>Browser previews with desktop, tablet, and mobile viewport options.</li>
              <li>Readable HTML source that can be copied or downloaded.</li>
            </ul>
          </article>

          <article className="mt-7">
            <h2 className="text-sm font-semibold text-zinc-200">Privacy and usage</h2>
            <p className="mt-2">You do not need to upload your project files. Template previews render in your browser while the service delivers catalog and template requests. Public activity is recorded as daily aggregates, not a per-user history.</p>
          </article>

          <section aria-labelledby="faq-heading" className="mt-7">
            <h2 id="faq-heading" className="text-sm font-semibold text-zinc-200">Frequently asked questions</h2>
            <details className="mt-3 border-b border-zinc-800/80 py-3">
              <summary className="cursor-pointer font-medium text-zinc-300">What can I do with Free HTML Templates?</summary>
              <p className="mt-2">Browse HTML templates, preview designs, inspect or copy the source, and download HTML files to customize in your own editor.</p>
            </details>
            <details className="border-b border-zinc-800/80 py-3">
              <summary className="cursor-pointer font-medium text-zinc-300">How do I find a specific component?</summary>
              <p className="mt-2">Search template names and tags, or browse the available categories and Popular view.</p>
            </details>
            <details className="border-b border-zinc-800/80 py-3">
              <summary className="cursor-pointer font-medium text-zinc-300">Do I need an account to use the catalog?</summary>
              <p className="mt-2">No account is needed to browse the public catalog, preview templates, inspect source code, or download HTML files.</p>
            </details>
            <details className="border-b border-zinc-800/80 py-3">
              <summary className="cursor-pointer font-medium text-zinc-300">Are all templates responsive?</summary>
              <p className="mt-2">Responsive behavior depends on each template. Use the desktop, tablet, and mobile preview modes, then test the downloaded file at your target sizes.</p>
            </details>
            <details className="border-b border-zinc-800/80 py-3">
              <summary className="cursor-pointer font-medium text-zinc-300">Does the tool upload my project files?</summary>
              <p className="mt-2">No project upload is needed. Template previews render in your browser; the service delivers catalog and template requests and records daily aggregate activity rather than a per-user history.</p>
            </details>
          </section>
        </section>

        <footer className="mt-8 border-t border-zinc-800/80 py-3 flex flex-col items-center justify-between gap-1.5 text-[10px] text-zinc-500 sm:flex-row">
          <span className="font-medium text-zinc-400">{settings.site_name || 'Free HTML Templates'} · Vib Tools</span>
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
                    onClick={() => {
                      if (viewMode !== 'preview') {
                        setModalPreviewRenderHtml(modalEditedHtml ?? modalPreviewHtml);
                      }
                      setViewMode('preview');
                    }}
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

                {viewMode === 'preview' && (
                  <label className="flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-[10px] font-medium text-zinc-300">
                    <span>Editable</span>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={previewEditable}
                      onChange={(event) => setPreviewEditable(event.target.checked)}
                      className="peer sr-only"
                      aria-label="Editable preview"
                    />
                    <span
                      aria-hidden="true"
                      className="relative h-4 w-7 rounded-full bg-zinc-700 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-zinc-100 after:transition-transform peer-checked:bg-emerald-700 peer-checked:after:translate-x-3 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/60"
                    />
                  </label>
                )}

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
                  onClick={() => handleDownload(activeModal, modalEditedHtml)}
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
                  {modalPreviewSrcDoc !== undefined && (
                    <iframe
                      ref={modalPreviewFrameRef}
                      title="Modal Preview"
                      srcDoc={modalPreviewSrcDoc}
                      sandbox="allow-scripts allow-modals"
                      onLoad={() => {
                        setModalPreviewError(false);
                        setModalPreviewLoading(false);
                        modalPreviewFrameRef.current?.contentWindow?.postMessage({
                          type: 'public-preview-editable',
                          enabled: previewEditable,
                        }, '*');
                      }}
                      onError={() => {
                        setModalPreviewError(true);
                        setModalPreviewLoading(false);
                      }}
                      className="w-full h-full border-0 shadow-none"
                    />
                  )}
                  {modalPreviewLoading && !modalPreviewError && (
                    <div role="status" aria-live="polite" className="absolute inset-0 z-10 flex items-center justify-center bg-[#0b0c0e]/85 text-xs text-zinc-400">
                      <span className="flex items-center gap-2">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Loading preview...
                      </span>
                    </div>
                  )}
                  {modalPreviewError && (
                    <div role="status" aria-live="polite" className="absolute inset-0 flex items-center justify-center bg-[#0b0c0e] text-xs text-zinc-400">
                      Preview unavailable
                    </div>
                  )}
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
