import type { Env } from '../api/[[route]].ts';
import { getPublicCategories, getPublicTemplateMetadata, getSiteSettings, getTursoClient, initTursoSchema, enforceTursoPersistence, isPlaceholderTursoUrl, TursoPersistenceError } from '../../src/lib/turso.ts';
import { renderTemplateSeoPage } from '../../src/lib/templateSeoPage.ts';

const htmlResponse = (body: string, status: number): Response => new Response(body, {
  status,
  headers: {
    'Content-Type': 'text/html; charset=UTF-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});

const unavailablePage = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Template temporarily unavailable</title></head><body><main><h1>Template temporarily unavailable</h1></main></body></html>';
const notFoundPage = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Template not found</title></head><body><main><h1>Template not found</h1><p>This HTML template may have been removed or is unavailable.</p><a href="/">Browse all templates</a></main></body></html>';

export const onRequest: PagesFunction<Env> = async (context) => {
  const env = context.env;
  if (isPlaceholderTursoUrl(env.TURSO_DATABASE_URL) || !env.TURSO_AUTH_TOKEN) {
    return htmlResponse(unavailablePage, 503);
  }

  try {
    const slug = decodeURIComponent(String(context.params.slug || '')).toLowerCase();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) return htmlResponse(notFoundPage, 404);

    const client = getTursoClient(env.TURSO_DATABASE_URL, env.TURSO_AUTH_TOKEN);
    enforceTursoPersistence(client);
    await initTursoSchema(client);

    const [templates, categories, settings] = await Promise.all([
      getPublicTemplateMetadata(client, { slug }),
      getPublicCategories(client),
      getSiteSettings(client),
    ]);
    const template = templates[0];
    if (!template) return htmlResponse(notFoundPage, 404);

    const category = categories.find((item) => item.name.toLowerCase() === template.category.toLowerCase());
    const shellResponse = await context.next();
    if (!shellResponse.ok) return htmlResponse(unavailablePage, shellResponse.status);

    const shell = await shellResponse.text();
    return htmlResponse(renderTemplateSeoPage(shell, template, category, settings), 200);
  } catch (error) {
    if (!(error instanceof TursoPersistenceError)) {
      console.error('Template SEO response failed', error instanceof Error ? error.name : 'RequestError');
    }
    return htmlResponse(unavailablePage, 503);
  }
};
