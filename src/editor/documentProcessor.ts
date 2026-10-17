import type { PreviewTextEdit } from './types.ts';

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

  Array.from(targets).forEach((target, index) => target.setAttribute('data-vib-editor-id', String(index)));
};

const getPreviewNodeShape = (target: Element) => Array.from(target.childNodes).map((node) => {
  if (node.nodeType === Node.ELEMENT_NODE) return `element:${(node as Element).tagName}`;
  if (node.nodeType === Node.TEXT_NODE) return 'text';
  if (node.nodeType === Node.COMMENT_NODE) return 'comment';
  return `node:${node.nodeType}`;
});

export const applyPreviewTextEdits = (html: string, edits: Record<string, PreviewTextEdit>) => {
  const editedDocument = new DOMParser().parseFromString(html, 'text/html');
  assignPreviewTextIds(editedDocument);
  Object.entries(edits).forEach(([id, edit]) => {
    const target = editedDocument.querySelector(`[data-vib-editor-id="${id}"]`);
    if (!target) throw new Error('Edited preview target is missing from the original HTML');
    const originalShape = getPreviewNodeShape(target);
    if (originalShape.length !== edit.shape.length || originalShape.some((node, index) => node !== edit.shape[index])) {
      throw new Error('Edited preview target structure changed');
    }
    edit.textNodes.forEach(({ index, text }) => {
      const node = target.childNodes[index];
      if (node?.nodeType !== Node.TEXT_NODE) throw new Error('Edited preview text node is missing');
      node.textContent = text;
    });
  });
  editedDocument.querySelectorAll('[data-vib-editor-id]').forEach((target) => {
    target.removeAttribute('data-vib-editor-id');
  });
  const doctype = editedDocument.doctype?.name || 'html';
  return `<!DOCTYPE ${doctype}>\n${editedDocument.documentElement.outerHTML}`;
};

export const createPreviewDocument = (html: string, baseUrl: string) => {
  const previewDocument = new DOMParser().parseFromString(html, 'text/html');
  assignPreviewTextIds(previewDocument);
  if (!previewDocument.head.querySelector('base[href]')) {
    const base = previewDocument.createElement('base');
    base.href = baseUrl;
    base.dataset.vibEditorInjected = 'base';
    previewDocument.head.insertBefore(base, previewDocument.head.firstChild);
  }

  const scrollbarStyle = previewDocument.createElement('style');
  scrollbarStyle.dataset.vibEditorInjected = 'scrollbars';
  scrollbarStyle.textContent = 'html,body,*{scrollbar-width:none!important;-ms-overflow-style:none!important}html::-webkit-scrollbar,body::-webkit-scrollbar,*::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}';
  previewDocument.head.appendChild(scrollbarStyle);

  const editorScript = previewDocument.createElement('script');
  editorScript.dataset.vibEditorInjected = 'bootstrap';
  editorScript.textContent = `(function () {
    const blockedSelector = 'script,style,textarea,input,select,option,svg,canvas,[contenteditable]:not([data-vib-editor-target]),[aria-hidden="true"]';
    let editingEnabled = true;
    const setEditable = (enabled) => {
      editingEnabled = enabled;
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
      if (event.source !== parent) return;
      if (event.data?.type === 'public-preview-editable') {
        setEditable(event.data.enabled === true);
        return;
      }
      if (event.data?.type === 'public-preview-focus-text' && /^\\d+$/.test(event.data.id)) {
        const target = document.querySelector('[data-vib-editor-id="' + event.data.id + '"]');
        if (!target) return;
        target.focus();
        const range = document.createRange();
        range.selectNodeContents(target);
        range.collapse(false);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    });
    document.addEventListener('click', (event) => {
      if (!editingEnabled || !(event.target instanceof Element)) return;
      const target = event.target.closest('[data-vib-editor-target]');
      const id = target?.getAttribute('data-vib-editor-id');
      if (id === null || id === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      window.parent.postMessage({ type: 'public-preview-text-selection', id }, '*');
    }, true);
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
  previewDocument.body.appendChild(editorScript);

  const doctype = previewDocument.doctype?.name || 'html';
  return `<!DOCTYPE ${doctype}>\n${previewDocument.documentElement.outerHTML}`;
};