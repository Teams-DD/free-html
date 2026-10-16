import type { Category, HtmlTemplate, SiteSettings } from '../types.ts';

export interface SeoMetadata {
  title: string;
  description: string;
  keywords: string;
}

interface SeoFields {
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
}

const compact = (value: string | null | undefined, maxLength: number): string =>
  String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength).trim();

const DEFAULT_HOME_DESCRIPTION = 'Browse free HTML templates and responsive website components. Preview designs, inspect source code, and download HTML snippets to customize for your project.';

const keywords = (value: string | null | undefined, defaults: string[]): string => {
  const candidates = value?.trim() ? value.split(',') : defaults;
  const output: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const keyword = compact(candidate, 80);
    const key = keyword.toLowerCase();
    if (!keyword || seen.has(key)) continue;
    const next = [...output, keyword].join(', ');
    if (next.length > 255) break;
    seen.add(key);
    output.push(keyword);
  }
  return output.join(', ');
};

const resolveMetadata = (fields: SeoFields, defaults: SeoMetadata): SeoMetadata => ({
  title: compact(fields.seo_title, 70) || compact(defaults.title, 70),
  description: compact(fields.seo_description, 160) || compact(defaults.description, 160),
  keywords: keywords(fields.seo_keywords, defaults.keywords.split(', ')),
});

export const getHomeSeoMetadata = (settings: Pick<SiteSettings, 'site_name' | 'site_description' | 'seo_title' | 'seo_description' | 'seo_keywords'>): SeoMetadata => {
  const siteName = !settings.site_name || settings.site_name === 'HTML Snippets & Templates'
    ? 'Free HTML Templates'
    : settings.site_name;
  const siteDescription = !settings.site_description || settings.site_description === 'Free responsive HTML snippets and component templates directory.'
    ? DEFAULT_HOME_DESCRIPTION
    : settings.site_description;
  return resolveMetadata(settings, {
    title: `${siteName} | Vib Tools`,
    description: siteDescription,
    keywords: 'free HTML templates, responsive HTML templates, HTML components, downloadable HTML snippets',
  });
};

export const getCategorySeoMetadata = (category: Pick<Category, 'name' | 'seo_title' | 'seo_description' | 'seo_keywords'>): SeoMetadata => {
  const name = compact(category.name, 60);
  return resolveMetadata(category, {
    title: `${name} HTML Templates | Vib Tools`,
    description: `Browse free ${name} HTML components and templates. Preview examples, inspect the code, and download a design to customize for your project.`,
    keywords: `${name} HTML templates, ${name} components, free HTML templates, HTML snippets`,
  });
};

export const getTemplateSeoMetadata = (template: Pick<HtmlTemplate, 'title' | 'category' | 'tags' | 'description' | 'seo_title' | 'seo_description' | 'seo_keywords'>): SeoMetadata => {
  const title = compact(template.title, 70);
  const category = compact(template.category, 40);
  return resolveMetadata(template, {
    title: `${title} HTML Template | Vib Tools`,
    description: template.description || `Preview and download the ${title} HTML template. Inspect its source code and customize this ${category} component for your project.`,
    keywords: [title, `${category} HTML components`, 'free HTML templates', 'HTML snippets', ...template.tags].join(', '),
  });
};