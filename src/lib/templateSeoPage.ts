import type { Category, PublicTemplateMetadata, SiteSettings } from '../types.ts';
import { getTemplateSeoMetadata } from './seo.ts';

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character] || character));

const replaceMeta = (html: string, kind: 'name' | 'property', name: string, value: string): string => {
  const pattern = new RegExp(`<meta\\s+${kind}="${name}"[^>]*\\/?>`, 'i');
  const tag = `<meta ${kind}="${name}" content="${escapeHtml(value)}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace(/<\/head>/i, `${tag}\n</head>`);
};

const templateContent = (template: PublicTemplateMetadata, category?: Category): string => {
  const metadata = getTemplateSeoMetadata(template);
  const categoryName = escapeHtml(category?.name || template.category || 'HTML');
  const title = escapeHtml(template.title);
  const keywords = template.tags.length > 0
    ? template.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')
    : `<li>${categoryName} HTML component</li>`;
  const categoryLink = category
    ? `<a href="/categories/${encodeURIComponent(category.slug)}">${categoryName} templates</a>`
    : '';
  const description = escapeHtml(metadata.description);

  return `<main class="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 text-zinc-300 sm:px-8">
    <nav aria-label="Breadcrumb" class="mb-6 flex flex-wrap gap-2 text-sm text-zinc-400">
      <a href="/" class="underline underline-offset-4 hover:text-zinc-100">All HTML templates</a>
      ${categoryLink ? `<span aria-hidden="true">/</span>${categoryLink}` : ''}
    </nav>
    <article>
      <header class="border-b border-zinc-800 pb-6">
        <p class="text-xs font-semibold uppercase tracking-wider text-emerald-400">${categoryName} component</p>
        <h1 class="mt-2 text-2xl font-semibold text-zinc-100">${title}</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">${description}</p>
      </header>
      <section class="mt-7">
        <h2 class="text-lg font-semibold text-zinc-100">About this ${categoryName} HTML template</h2>
        <p class="mt-2 text-sm leading-6 text-zinc-300">${title} is an editable HTML component in the ${categoryName} collection. Use it as a focused starting point for an interface, not as a complete website. Preview the design, inspect the source, and adapt its markup to the structure and visual language of your own project.</p>
        <p class="mt-3 text-sm leading-6 text-zinc-300">The file is provided so you can evaluate the actual HTML before integrating it. Review its styles, scripts, sample content, and external dependencies. Replace example text and links with project-specific content, and verify that every control behaves as intended instead of assuming a visual preview guarantees production readiness.</p>
      </section>
      <section class="mt-7">
        <h2 class="text-lg font-semibold text-zinc-100">Template tags and details</h2>
        <p class="mt-2 text-sm leading-6 text-zinc-300">These tags describe the component and help you compare it with related patterns in the catalog.</p>
        <ul class="mt-2 flex flex-wrap gap-x-5 gap-y-1 pl-5 text-sm leading-6 text-zinc-300">${keywords}</ul>
      </section>
      <section class="mt-7">
        <h2 class="text-lg font-semibold text-zinc-100">Preview and customize</h2>
        <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-zinc-300">
          <li>Open the preview and check the component at desktop, tablet, and mobile widths.</li>
          <li>Switch to the HTML view to inspect the markup before using it.</li>
          <li>Copy the source or download the HTML file, then edit it in your project.</li>
          <li>Test the result in your own browser and confirm that styles and scripts load correctly.</li>
        </ol>
      </section>
      <section class="mt-7">
        <h2 class="text-lg font-semibold text-zinc-100">Before publishing</h2>
        <p class="mt-2 text-sm leading-6 text-zinc-300">Check keyboard access, visible focus, text contrast, responsive layout, and any form or button behavior. Confirm that linked assets are available over HTTPS and that third-party scripts are appropriate for your site. Update page titles, labels, image alternatives, and placeholder URLs where needed. The preview is a quick evaluation tool; your own project remains the place to verify accessibility, browser support, performance, and integration with existing styles.</p>
        <p class="mt-3 text-sm leading-6 text-zinc-300">If you need a different pattern, browse the related ${categoryName} components or return to the full catalog. Comparing alternatives before copying can help you choose markup that fits your layout and avoids unnecessary dependencies.</p>
      </section>
      <section aria-labelledby="template-faq" class="mt-8 border-t border-zinc-800 pt-6">
        <h2 id="template-faq" class="text-lg font-semibold text-zinc-100">Frequently asked questions</h2>
        <details class="mt-3 border-b border-zinc-800 py-3">
          <summary class="cursor-pointer font-medium text-zinc-200">What can I do with Free HTML Templates?</summary>
          <p class="mt-2 text-sm leading-6 text-zinc-300">Browse HTML templates, preview designs, inspect or copy the source, and download HTML files to customize in your own editor.</p>
        </details>
        <details class="border-b border-zinc-800 py-3">
          <summary class="cursor-pointer font-medium text-zinc-200">How do I find a specific component?</summary>
          <p class="mt-2 text-sm leading-6 text-zinc-300">Search template names and tags, or browse the available categories and Popular view.</p>
        </details>
        <details class="border-b border-zinc-800 py-3">
          <summary class="cursor-pointer font-medium text-zinc-200">Do I need an account to use the catalog?</summary>
          <p class="mt-2 text-sm leading-6 text-zinc-300">No account is needed to browse the public catalog, preview templates, inspect source code, or download HTML files.</p>
        </details>
        <details class="border-b border-zinc-800 py-3">
          <summary class="cursor-pointer font-medium text-zinc-200">Are all templates responsive?</summary>
          <p class="mt-2 text-sm leading-6 text-zinc-300">Responsive behavior depends on each template. Use the desktop, tablet, and mobile preview modes, then test the downloaded file at your target sizes.</p>
        </details>
        <details class="border-b border-zinc-800 py-3">
          <summary class="cursor-pointer font-medium text-zinc-200">Does the tool upload my project files?</summary>
          <p class="mt-2 text-sm leading-6 text-zinc-300">No project upload is needed. Template previews render in your browser; the service delivers catalog and template requests and records daily aggregate activity rather than a per-user history.</p>
        </details>
      </section>
      <footer class="mt-8 border-t border-zinc-800 pt-5 text-sm">
        <a href="/" class="font-medium text-emerald-400 underline underline-offset-4 hover:text-emerald-300">Browse all free HTML templates</a>
      </footer>
    </article>
  </main>`;
};

export const renderTemplateSeoPage = (
  shell: string,
  template: PublicTemplateMetadata,
  category: Category | undefined,
  settings: SiteSettings
): string => {
  const metadata = getTemplateSeoMetadata(template);
  const canonical = `https://html.vibid.my/templates/${encodeURIComponent(template.slug)}`;
  let html = shell.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`);
  html = replaceMeta(html, 'name', 'description', metadata.description);
  html = replaceMeta(html, 'name', 'keywords', metadata.keywords);
  html = replaceMeta(html, 'property', 'og:title', metadata.title);
  html = replaceMeta(html, 'property', 'og:description', metadata.description);
  html = replaceMeta(html, 'property', 'og:url', canonical);
  html = replaceMeta(html, 'property', 'og:image', settings.og_image || 'https://html.vibid.my/og-image.svg');
  html = replaceMeta(html, 'name', 'twitter:title', metadata.title);
  html = replaceMeta(html, 'name', 'twitter:description', metadata.description);
  html = replaceMeta(html, 'name', 'twitter:image', settings.og_image || 'https://html.vibid.my/og-image.svg');
  html = html.replace(/<link\s+rel="canonical"[^>]*\/?>/i, `<link rel="canonical" href="${escapeHtml(canonical)}" />`);
  const rootPattern = /(<div id="root"[^>]*>)[\s\S]*?(<\/div>)/i;
  if (!rootPattern.test(html)) throw new Error('The application root was not found in the HTML shell.');
  return html.replace(rootPattern, (_match, opening: string, closing: string) =>
    `${opening}${templateContent(template, category)}${closing}`
  );
};