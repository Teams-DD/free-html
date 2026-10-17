import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applyPreviewTextEdits, createPreviewDocument } from './documentProcessor.ts';
import { LocalHtmlStore } from './localHtmlStore.ts';
import type {
  EditorDownloadSource,
  PreviewEditableMessage,
  PreviewFocusTextMessage,
  PreviewTextEdit,
  PreviewTextEditMessage,
  PreviewTextSelectionMessage,
} from './types.ts';

export const useHtmlEditorEngine = (slug: string | null, previewBaseUrl: string | null) => {
  const [sourceHtml, setSourceHtml] = useState<string | null>(null);
  const [textEdits, setTextEdits] = useState<Record<string, PreviewTextEdit>>({});
  const [renderHtml, setRenderHtml] = useState<string | null>(null);
  const [editable, setEditable] = useState(true);
  const [localEditActive, setLocalEditActive] = useState(false);
  const [pendingTextSelectionId, setPendingTextSelectionId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const storeRef = useRef<LocalHtmlStore | null>(null);
  if (!storeRef.current) storeRef.current = new LocalHtmlStore();
  const sourceHtmlRef = useRef(sourceHtml);
  const textEditsRef = useRef(textEdits);
  const localEditActiveRef = useRef(localEditActive);
  sourceHtmlRef.current = sourceHtml;
  textEditsRef.current = textEdits;
  localEditActiveRef.current = localEditActive;

  const reset = useCallback(() => {
    setSourceHtml(null);
    setTextEdits({});
    setRenderHtml(null);
    setEditable(true);
    setLocalEditActive(false);
    setPendingTextSelectionId(null);
    setProcessing(false);
    setStorageError(null);
  }, []);

  useEffect(() => {
    reset();
  }, [reset, slug]);

  const editedResult = useMemo(() => {
    if (sourceHtml === null || Object.keys(textEdits).length === 0) {
      return { html: null, error: false };
    }
    try {
      return { html: applyPreviewTextEdits(sourceHtml, textEdits), error: false };
    } catch {
      return { html: null, error: true };
    }
  }, [sourceHtml, textEdits]);

  const previewSrcDoc = useMemo(() => {
    if (!slug || previewBaseUrl === null || renderHtml === null) return undefined;
    return createPreviewDocument(renderHtml, previewBaseUrl);
  }, [previewBaseUrl, renderHtml, slug]);

  const loadSourceHtml = useCallback((html: string) => {
    setSourceHtml(html);
    setTextEdits({});
    setRenderHtml(html);
  }, []);

  const initializePreview = useCallback(async (
    templateSlug: string,
    fetchOriginalHtml: () => Promise<string>,
    requireLocalRecord = false,
  ) => {
    setStorageError(null);
    const stored = storeRef.current!.read(templateSlug);
    if (stored.kind === 'valid') {
      loadSourceHtml(stored.record.html);
      setLocalEditActive(true);
      return { kind: 'loaded-local' as const };
    }
    if (stored.kind === 'error') {
      setStorageError(stored.reason === 'corrupt'
        ? 'Saved local HTML is invalid. It was not replaced with server HTML.'
        : 'Browser storage is unavailable. Local HTML could not be checked.');
      return { kind: 'error' as const };
    }
    if (requireLocalRecord) {
      setStorageError('No saved local HTML exists for this edit link.');
      return { kind: 'error' as const };
    }

    try {
      const html = await fetchOriginalHtml();
      loadSourceHtml(html);
      setLocalEditActive(false);
      return { kind: 'loaded-server' as const };
    } catch {
      setStorageError('Unable to load template HTML.');
      return { kind: 'error' as const };
    }
  }, [loadSourceHtml]);

  const focusSelectedText = useCallback(() => {
    if (pendingTextSelectionId === null) return;
    const message: PreviewFocusTextMessage = {
      type: 'public-preview-focus-text',
      id: pendingTextSelectionId,
    };
    previewFrameRef.current?.contentWindow?.postMessage(message, '*');
    setPendingTextSelectionId(null);
  }, [pendingTextSelectionId]);

  const startLocalEdit = useCallback(async (
    templateSlug: string,
    fetchOriginalHtml: () => Promise<string>,
  ) => {
    setProcessing(true);
    setStorageError(null);
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    try {
      if (localEditActive && sourceHtml !== null) {
        focusSelectedText();
        return true;
      }

      const stored = storeRef.current!.read(templateSlug);
      if (stored.kind === 'error') {
        setStorageError(stored.reason === 'corrupt'
          ? 'Saved local HTML is invalid. It was not replaced with server HTML.'
          : 'Browser storage is unavailable. Local editing cannot start.');
        return false;
      }

      const html = stored.kind === 'valid'
        ? stored.record.html
        : sourceHtml ?? await fetchOriginalHtml();
      const writeResult = stored.kind === 'valid'
        ? stored
        : storeRef.current!.write(templateSlug, html);
      if (writeResult.kind === 'error') {
        setStorageError(writeResult.reason === 'quota'
          ? 'Browser storage is full. Local editing was not started.'
          : 'Browser storage is unavailable. Local editing was not started.');
        return false;
      }

      setSourceHtml(writeResult.record.html);
      setTextEdits({});
      setRenderHtml(writeResult.record.html);
      setLocalEditActive(true);
      focusSelectedText();
      return true;
    } catch {
      setStorageError('Template HTML could not be prepared for local editing.');
      return false;
    } finally {
      setProcessing(false);
    }
  }, [focusSelectedText, localEditActive, sourceHtml]);

  const cancelTextSelection = useCallback(() => {
    setPendingTextSelectionId(null);
    setStorageError(null);
  }, []);

  const restoreEditedPreview = useCallback(() => {
    setRenderHtml(editedResult.html ?? sourceHtml);
  }, [editedResult.html, sourceHtml]);

  const syncEditableState = useCallback(() => {
    const message: PreviewEditableMessage = { type: 'public-preview-editable', enabled: editable };
    previewFrameRef.current?.contentWindow?.postMessage(message, '*');
  }, [editable]);

  const getDownloadSource = useCallback((): EditorDownloadSource => {
    if (localEditActive && sourceHtml !== null) {
      if (editedResult.error) return { kind: 'error' };
      return { kind: 'edited', html: editedResult.html ?? sourceHtml };
    }
    if (Object.keys(textEdits).length === 0) return { kind: 'original' };
    if (editedResult.error || typeof editedResult.html !== 'string') return { kind: 'error' };
    return { kind: 'edited', html: editedResult.html };
  }, [editedResult.error, editedResult.html, localEditActive, sourceHtml, textEdits]);

  useEffect(() => {
    if (!slug) return;

    const handlePreviewTextEdits = (event: MessageEvent) => {
      if (event.source !== previewFrameRef.current?.contentWindow) return;
      const message = event.data as { type?: unknown; edits?: unknown } | null;
      if (message?.type === 'public-preview-text-selection') {
        const selection = message as Partial<PreviewTextSelectionMessage>;
        if (typeof selection.id === 'string' && /^\d+$/.test(selection.id)) {
          setPendingTextSelectionId(selection.id);
          setStorageError(null);
        }
        return;
      }
      if (message?.type !== 'public-preview-text-edits' || !Array.isArray(message.edits)) return;
      const edits = message.edits.filter((item): item is PreviewTextEditMessage['edits'][number] => {
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
      const updated = { ...textEditsRef.current };
      edits.forEach(({ id, shape, textNodes }) => {
        updated[id] = { shape, textNodes };
      });
      textEditsRef.current = updated;

      if (localEditActiveRef.current && sourceHtmlRef.current !== null) {
        try {
          const html = applyPreviewTextEdits(sourceHtmlRef.current, updated);
          const result = storeRef.current!.write(slug, html);
          setStorageError(result.kind === 'error'
            ? result.reason === 'quota'
              ? 'Local edits could not be saved because browser storage is full.'
              : 'Local edits could not be saved because browser storage is unavailable.'
            : null);
        } catch {
          setStorageError('Preview text changes could not be synchronized with the local HTML. Review the edit before downloading.');
        }
      }

      setTextEdits(updated);
    };

    window.addEventListener('message', handlePreviewTextEdits);
    return () => window.removeEventListener('message', handlePreviewTextEdits);
  }, [slug]);

  useEffect(() => {
    if (!slug || renderHtml === null) return;
    syncEditableState();
  }, [renderHtml, slug, syncEditableState]);

  return {
    editable,
    cancelTextSelection,
    getDownloadSource,
    initializePreview,
    isLocalEditActive: localEditActive,
    pendingTextSelectionId,
    processing,
    previewFrameRef,
    previewSrcDoc,
    reset,
    restoreEditedPreview,
    startLocalEdit,
    setEditable,
    loadSourceHtml,
    syncEditableState,
    sourceHtml,
    storageError,
  };
};