export const normalizeScriptSnippet = (code: string): string =>
  code.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();

const prepareScripts = (fragment: DocumentFragment): void => {
  for (const original of Array.from(fragment.querySelectorAll('script'))) {
    const script = document.createElement('script');
    for (const attribute of Array.from(original.attributes)) {
      script.setAttribute(attribute.name, attribute.value);
    }
    if (original.hasAttribute('src') && !original.hasAttribute('async') && !original.hasAttribute('defer')) {
      script.async = false;
    }
    script.textContent = original.textContent;
    original.replaceWith(script);
  }
};

export const installSiteScripts = (headerCode: string, footerCode: string): (() => void) => {
  const installedNodes: Node[] = [];
  const install = (rawCode: string, target: HTMLElement) => {
    const code = normalizeScriptSnippet(rawCode);
    if (!code) return;
    const template = document.createElement('template');
    template.innerHTML = code;
    prepareScripts(template.content);
    installedNodes.push(...Array.from(template.content.childNodes));
    target.append(template.content);
  };

  install(headerCode, document.head);
  install(footerCode, document.body);

  return () => {
    for (const node of installedNodes) node.parentNode?.removeChild(node);
  };
};
