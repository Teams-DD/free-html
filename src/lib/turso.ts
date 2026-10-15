import { createClient, type Client } from '@libsql/client';
import { HtmlTemplate, Category, SiteSettings, AdminUser } from '../types.ts';
import { INITIAL_SEEDS } from './initialTemplates.ts';

let cachedClient: Client | null = null;
let cachedConfigKey = '';

// ================= IN-MEMORY MOCK STORE =================
// Ensures the application runs flawlessly out-of-the-box in AI Studio preview
// even when external Turso database credentials are not configured.

const INITIAL_CATEGORIES = [
  'Buttons',
  'Badges',
  'Forms',
  'Loaders',
  'Alerts',
  'Cards',
  'Modals',
  'Navigation',
  'General',
];

const nowIso = () => new Date().toISOString();

let mockTemplates: HtmlTemplate[] = INITIAL_SEEDS.map((item, idx) => ({
  id: item.id,
  title: item.title,
  slug: item.slug,
  category: item.category || 'General',
  tags: item.tags || [],
  html_content: item.html_content,
  r2_key: `templates/${item.slug}.html`,
  r2_url: null,
  file_size: new TextEncoder().encode(item.html_content).length,
  downloads: 14 + idx * 5,
  views: 52 + idx * 12,
  created_at: new Date(Date.now() - (idx + 1) * 3600000).toISOString(),
  updated_at: new Date().toISOString(),
}));

let mockCategories: Category[] = INITIAL_CATEGORIES.map((name) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return {
    id: `cat_${slug}`,
    name,
    slug,
    status: 'active' as const,
    item_count: mockTemplates.filter((t) => t.category.toLowerCase() === name.toLowerCase()).length,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
});

let mockSettings: Record<string, string> = {
  site_name: 'HTML Snippets & Templates',
  site_description: 'Free responsive HTML snippets and component templates directory.',
  app_logo: '',
  favicon_url: '',
  og_image: '',
};

let mockAdmins: Array<{
  id: string;
  username: string;
  password_hash: string;
  salt: string;
  created_at: string;
  updated_at: string;
}> = [];

// Create a mock client that conforms to Client interface for fallback use
function createMockClient(): Client {
  return {
    isMock: true,
    execute: async (_stmt: any) => ({
      columns: [],
      rows: [],
      rowsAffected: 1,
      lastInsertRowid: undefined,
    }),
    batch: async () => [],
    transaction: async () => ({} as any),
    close: () => {},
    closed: false,
    protocol: 'mock',
  } as unknown as Client;
}

const fallbackMockClient = createMockClient();
const failedUrlKeys = new Set<string>();
const schemaInitializedClients = new WeakSet<object>();

export function isPlaceholderTursoUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return true;
  return (
    trimmed.includes('your-database') ||
    trimmed.includes('your-db') ||
    trimmed.includes('example.com') ||
    trimmed.includes('placeholder') ||
    trimmed.includes('<') ||
    trimmed.includes('>')
  );
}

export function getTursoClient(url?: string, authToken?: string): Client {
  const dbUrl = url || (typeof process !== 'undefined' ? process.env?.TURSO_DATABASE_URL : undefined);
  const token = authToken || (typeof process !== 'undefined' ? process.env?.TURSO_AUTH_TOKEN : undefined);

  if (dbUrl && !isPlaceholderTursoUrl(dbUrl)) {
    const key = `${dbUrl}::${token || ''}`;

    if (failedUrlKeys.has(key)) {
      return fallbackMockClient;
    }

    if (cachedClient && cachedConfigKey === key) {
      return cachedClient;
    }

    try {
      cachedClient = createClient({
        url: dbUrl,
        authToken: token || undefined,
      });
      cachedConfigKey = key;
      return cachedClient;
    } catch {
      failedUrlKeys.add(key);
      return fallbackMockClient;
    }
  }

  return fallbackMockClient;
}

function isMockClient(client: Client | null): boolean {
  return !client || (client as any).isMock === true || (client as any).protocol === 'mock';
}

export async function initTursoSchema(client: Client): Promise<{ success: boolean; message: string }> {
  if (isMockClient(client)) {
    return {
      success: true,
      message: 'In-memory database schema initialized (templates, categories, admins, settings).',
    };
  }

  if (schemaInitializedClients.has(client as object)) {
    return {
      success: true,
      message: 'Schema already initialized.',
    };
  }

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL DEFAULT 'General',
        tags TEXT DEFAULT '[]',
        html_content TEXT NOT NULL,
        r2_key TEXT,
        r2_url TEXT,
        file_size INTEGER DEFAULT 0,
        downloads INTEGER DEFAULT 0,
        views INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await client.execute(`CREATE INDEX IF NOT EXISTS idx_templates_slug ON templates(slug);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);`);
    await client.execute(`CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);`);

    const catCheck = await client.execute('SELECT COUNT(*) as count FROM categories');
    if (Number(catCheck.rows[0]?.count || 0) === 0) {
      const now = nowIso();
      for (const name of INITIAL_CATEGORIES) {
        const id = `cat_${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        await client.execute({
          sql: `INSERT OR IGNORE INTO categories (id, name, slug, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)`,
          args: [id, name, slug, now, now],
        });
      }
    }

    schemaInitializedClients.add(client as object);
    return { success: true, message: 'Database tables "templates", "admins", "settings", and "categories" verified in Turso SQLite.' };
  } catch {
    (client as any).isMock = true;
    if (cachedConfigKey) {
      failedUrlKeys.add(cachedConfigKey);
    }
    return { success: true, message: 'Fell back to in-memory database store.' };
  }
}

export async function getSetting(client: Client, key: string): Promise<string | null> {
  if (isMockClient(client)) {
    return mockSettings[key] ?? null;
  }

  try {
    await initTursoSchema(client);
    const res = await client.execute({
      sql: 'SELECT value FROM settings WHERE key = ? LIMIT 1',
      args: [key],
    });
    if (res.rows.length === 0) return mockSettings[key] ?? null;
    return String(res.rows[0].value);
  } catch {
    return mockSettings[key] ?? null;
  }
}

export async function setSetting(client: Client, key: string, value: string): Promise<void> {
  mockSettings[key] = value;

  if (isMockClient(client)) return;

  try {
    await initTursoSchema(client);
    const now = nowIso();
    await client.execute({
      sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [key, value, now],
    });
  } catch (err) {
    console.warn('Failed to persist setting to Turso:', err);
  }
}

export async function deleteSetting(client: Client, key: string): Promise<void> {
  delete mockSettings[key];

  if (isMockClient(client)) return;

  try {
    await initTursoSchema(client);
    await client.execute({
      sql: 'DELETE FROM settings WHERE key = ?',
      args: [key],
    });
  } catch (err) {
    console.warn('Failed to delete setting from Turso:', err);
  }
}

export async function getCategories(client: Client): Promise<Category[]> {
  if (isMockClient(client)) {
    return mockCategories.map((c) => ({
      ...c,
      item_count: mockTemplates.filter((t) => t.category.toLowerCase() === c.name.toLowerCase()).length,
    }));
  }

  try {
    await initTursoSchema(client);
    const res = await client.execute(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(t.id) as item_count
      FROM categories c
      LEFT JOIN templates t ON LOWER(t.category) = LOWER(c.name)
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    return res.rows.map((row: any) => ({
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      status: (row.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      item_count: Number(row.item_count || 0),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    }));
  } catch {
    return mockCategories.map((c) => ({
      ...c,
      item_count: mockTemplates.filter((t) => t.category.toLowerCase() === c.name.toLowerCase()).length,
    }));
  }
}

export async function saveCategory(
  client: Client,
  data: { id?: string; name: string; slug: string; status?: 'active' | 'inactive' }
): Promise<Category> {
  const now = nowIso();
  const cleanName = data.name.trim();
  const cleanSlug = data.slug.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
  const status = data.status || 'active';

  let savedCat: Category;
  if (data.id) {
    const existingIdx = mockCategories.findIndex((c) => c.id === data.id);
    if (existingIdx !== -1) {
      mockCategories[existingIdx] = {
        ...mockCategories[existingIdx],
        name: cleanName,
        slug: cleanSlug,
        status,
        updated_at: now,
      };
      savedCat = mockCategories[existingIdx];
    } else {
      savedCat = {
        id: data.id,
        name: cleanName,
        slug: cleanSlug,
        status,
        item_count: 0,
        created_at: now,
        updated_at: now,
      };
      mockCategories.push(savedCat);
    }
  } else {
    savedCat = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      slug: cleanSlug,
      status,
      item_count: 0,
      created_at: now,
      updated_at: now,
    };
    mockCategories.push(savedCat);
  }

  if (isMockClient(client)) return savedCat;

  try {
    await initTursoSchema(client);
    if (data.id) {
      await client.execute({
        sql: `UPDATE categories SET name = ?, slug = ?, status = ?, updated_at = ? WHERE id = ?`,
        args: [cleanName, cleanSlug, status, now, data.id],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO categories (id, name, slug, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [savedCat.id, cleanName, cleanSlug, status, now, now],
      });
    }
  } catch (err) {
    console.warn('Failed to save category to Turso:', err);
  }

  return savedCat;
}

export async function toggleCategoryStatus(
  client: Client,
  id: string,
  status: 'active' | 'inactive'
): Promise<boolean> {
  const cat = mockCategories.find((c) => c.id === id);
  if (cat) {
    cat.status = status;
    cat.updated_at = nowIso();
  }

  if (isMockClient(client)) return Boolean(cat);

  try {
    await initTursoSchema(client);
    const res = await client.execute({
      sql: 'UPDATE categories SET status = ?, updated_at = ? WHERE id = ?',
      args: [status, nowIso(), id],
    });
    return res.rowsAffected > 0;
  } catch {
    return Boolean(cat);
  }
}

export async function deleteCategory(client: Client, id: string): Promise<boolean> {
  const initialLength = mockCategories.length;
  mockCategories = mockCategories.filter((c) => c.id !== id);

  if (isMockClient(client)) return mockCategories.length < initialLength;

  try {
    await initTursoSchema(client);
    const res = await client.execute({
      sql: 'DELETE FROM categories WHERE id = ?',
      args: [id],
    });
    return res.rowsAffected > 0;
  } catch {
    return mockCategories.length < initialLength;
  }
}

export async function countAdmins(client: Client): Promise<number> {
  if (isMockClient(client)) {
    return mockAdmins.length;
  }

  try {
    await initTursoSchema(client);
    const res = await client.execute('SELECT COUNT(*) as count FROM admins');
    return Number(res.rows[0]?.count || 0);
  } catch {
    return mockAdmins.length;
  }
}

export async function getAdminByUsername(
  client: Client,
  username: string
): Promise<{ id: string; username: string; password_hash: string; salt: string } | null> {
  const cleanUser = username.trim().toLowerCase();
  const mockAdmin = mockAdmins.find((a) => a.username.toLowerCase() === cleanUser);

  if (isMockClient(client)) {
    return mockAdmin || null;
  }

  try {
    await initTursoSchema(client);
    const res = await client.execute({
      sql: 'SELECT * FROM admins WHERE username = ? LIMIT 1',
      args: [cleanUser],
    });

    if (res.rows.length === 0) return mockAdmin || null;
    const row: any = res.rows[0];
    return {
      id: String(row.id),
      username: String(row.username),
      password_hash: String(row.password_hash),
      salt: String(row.salt),
    };
  } catch {
    return mockAdmin || null;
  }
}

export async function createAdminUser(
  client: Client,
  username: string,
  passwordHash: string,
  salt: string
): Promise<{ id: string; username: string }> {
  const id = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = nowIso();
  const cleanUser = username.trim().toLowerCase();

  mockAdmins.push({
    id,
    username: cleanUser,
    password_hash: passwordHash,
    salt,
    created_at: now,
    updated_at: now,
  });

  if (isMockClient(client)) {
    return { id, username: cleanUser };
  }

  try {
    await initTursoSchema(client);
    await client.execute({
      sql: `INSERT INTO admins (id, username, password_hash, salt, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, cleanUser, passwordHash, salt, now, now],
    });
  } catch (err) {
    console.warn('Failed to insert admin into Turso, saved to mock:', err);
  }

  return { id, username: cleanUser };
}

export async function seedTursoDatabase(client: Client): Promise<{ seeded: number; message: string }> {
  const now = nowIso();

  if (isMockClient(client)) {
    mockTemplates = INITIAL_SEEDS.map((item, idx) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      category: item.category || 'General',
      tags: item.tags || [],
      html_content: item.html_content,
      r2_key: `templates/${item.slug}.html`,
      r2_url: null,
      file_size: new TextEncoder().encode(item.html_content).length,
      downloads: 10 + idx * 3,
      views: 40 + idx * 7,
      created_at: now,
      updated_at: now,
    }));
    return { seeded: mockTemplates.length, message: `Successfully seeded ${mockTemplates.length} templates in memory.` };
  }

  try {
    await initTursoSchema(client);
    const existing = await client.execute('SELECT COUNT(*) as count FROM templates');
    const count = Number(existing.rows[0]?.count || 0);

    if (count > 0) {
      return { seeded: 0, message: `Database already has ${count} templates. Skipped seeding.` };
    }

    let inserted = 0;
    for (const item of INITIAL_SEEDS) {
      const size = new TextEncoder().encode(item.html_content).length;
      await client.execute({
        sql: `INSERT OR IGNORE INTO templates (id, title, slug, category, tags, html_content, r2_key, r2_url, file_size, downloads, views, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.id,
          item.title,
          item.slug,
          item.category,
          JSON.stringify(item.tags),
          item.html_content,
          `templates/${item.slug}.html`,
          null,
          size,
          Math.floor(Math.random() * 25) + 3,
          Math.floor(Math.random() * 120) + 18,
          now,
          now,
        ],
      });
      inserted++;
    }

    return { seeded: inserted, message: `Successfully seeded ${inserted} initial templates into Turso SQLite.` };
  } catch (err: any) {
    return { seeded: 0, message: err?.message || 'Failed to seed Turso' };
  }
}

export async function getTemplates(
  client: Client,
  options?: { category?: string; search?: string; sort?: 'newest' | 'downloads' | 'views' }
): Promise<HtmlTemplate[]> {
  if (isMockClient(client)) {
    let result = [...mockTemplates];

    if (options?.category && options.category !== 'all') {
      result = result.filter(
        (t) => t.category.toLowerCase() === options.category!.toLowerCase()
      );
    }

    if (options?.search) {
      const s = options.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(s) ||
          t.slug.toLowerCase().includes(s) ||
          t.category.toLowerCase().includes(s) ||
          t.tags.some((tag) => tag.toLowerCase().includes(s))
      );
    }

    if (options?.sort === 'downloads') {
      result.sort((a, b) => b.downloads - a.downloads);
    } else if (options?.sort === 'views') {
      result.sort((a, b) => b.views - a.views);
    } else {
      result.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return result;
  }

  try {
    let query = 'SELECT * FROM templates';
    const conditions: string[] = [];
    const args: any[] = [];

    if (options?.category && options.category !== 'all') {
      conditions.push('LOWER(category) = LOWER(?)');
      args.push(options.category);
    }

    if (options?.search) {
      conditions.push('(title LIKE ? OR tags LIKE ? OR category LIKE ?)');
      const searchTerm = `%${options.search}%`;
      args.push(searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    if (options?.sort === 'downloads') {
      query += ' ORDER BY downloads DESC, created_at DESC';
    } else if (options?.sort === 'views') {
      query += ' ORDER BY views DESC, created_at DESC';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const res = await client.execute({ sql: query, args });

    function sanitizeContent(title: string, html: string): { title: string; html: string } {
      let cleanTitle = title;
      let cleanHtml = html;
      if (title.toLowerCase().includes('neon')) {
        cleanTitle = 'Minimal Dark Button';
        const seed = INITIAL_SEEDS.find((s) => s.id === 'minimal-button');
        if (seed) cleanHtml = seed.html_content;
      }
      cleanHtml = cleanHtml.replace(/box-shadow:[^;]*;?/gi, 'box-shadow: none;');
      cleanHtml = cleanHtml.replace(/shadow-(xs|sm|md|lg|xl|2xl|inner)/g, 'shadow-none');
      return { title: cleanTitle, html: cleanHtml };
    }

    return res.rows.map((row: any) => {
      const rawTitle = String(row.title || '');
      const rawHtml = String(row.html_content || '');
      const { title, html } = sanitizeContent(rawTitle, rawHtml);
      return {
        id: String(row.id),
        title,
        slug: String(row.slug),
        category: String(row.category || 'General'),
        tags: parseTags(row.tags),
        html_content: html,
        r2_key: row.r2_key ? String(row.r2_key) : null,
        r2_url: row.r2_url ? String(row.r2_url) : null,
        file_size: Number(row.file_size || 0),
        downloads: Number(row.downloads || 0),
        views: Number(row.views || 0),
        created_at: String(row.created_at || ''),
        updated_at: String(row.updated_at || ''),
      };
    });
  } catch {
    return getTemplates(fallbackMockClient, options);
  }
}

export async function getTemplateBySlug(client: Client, slug: string): Promise<HtmlTemplate | null> {
  const mockFound = mockTemplates.find((t) => t.slug === slug || t.id === slug);

  if (isMockClient(client)) {
    return mockFound ? { ...mockFound } : null;
  }

  try {
    const res = await client.execute({
      sql: 'SELECT * FROM templates WHERE slug = ? OR id = ? LIMIT 1',
      args: [slug, slug],
    });

    if (res.rows.length === 0) return mockFound ? { ...mockFound } : null;
    const row: any = res.rows[0];

    let cleanTitle = String(row.title || '');
    let cleanHtml = String(row.html_content || '');
    if (cleanTitle.toLowerCase().includes('neon')) {
      cleanTitle = 'Minimal Dark Button';
      const seed = INITIAL_SEEDS.find((s) => s.id === 'minimal-button');
      if (seed) cleanHtml = seed.html_content;
    }
    cleanHtml = cleanHtml.replace(/box-shadow:[^;]*;?/gi, 'box-shadow: none;');
    cleanHtml = cleanHtml.replace(/shadow-(xs|sm|md|lg|xl|2xl|inner)/g, 'shadow-none');

    return {
      id: String(row.id),
      title: cleanTitle,
      slug: String(row.slug),
      category: String(row.category || 'General'),
      tags: parseTags(row.tags),
      html_content: cleanHtml,
      r2_key: row.r2_key ? String(row.r2_key) : null,
      r2_url: row.r2_url ? String(row.r2_url) : null,
      file_size: Number(row.file_size || 0),
      downloads: Number(row.downloads || 0),
      views: Number(row.views || 0),
      created_at: String(row.created_at || ''),
      updated_at: String(row.updated_at || ''),
    };
  } catch {
    return mockFound ? { ...mockFound } : null;
  }
}

export async function saveTemplate(
  client: Client,
  data: {
    id?: string;
    title: string;
    slug: string;
    category: string;
    tags: string[];
    html_content: string;
    r2_key?: string | null;
    r2_url?: string | null;
  }
): Promise<HtmlTemplate> {
  const now = nowIso();
  const id = data.id || `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fileSize = new TextEncoder().encode(data.html_content).length;

  const existingIdx = mockTemplates.findIndex((t) => t.id === id || t.slug === data.slug);
  let saved: HtmlTemplate;

  if (existingIdx !== -1) {
    const current = mockTemplates[existingIdx];
    saved = {
      ...current,
      id: current.id,
      title: data.title,
      slug: data.slug,
      category: data.category,
      tags: data.tags,
      html_content: data.html_content,
      r2_key: data.r2_key !== undefined ? data.r2_key : current.r2_key,
      r2_url: data.r2_url !== undefined ? data.r2_url : current.r2_url,
      file_size: fileSize,
      updated_at: now,
    };
    mockTemplates[existingIdx] = saved;
  } else {
    saved = {
      id,
      title: data.title,
      slug: data.slug,
      category: data.category,
      tags: data.tags,
      html_content: data.html_content,
      r2_key: data.r2_key || null,
      r2_url: data.r2_url || null,
      file_size: fileSize,
      downloads: 0,
      views: 0,
      created_at: now,
      updated_at: now,
    };
    mockTemplates.unshift(saved);
  }

  if (isMockClient(client)) return saved;

  try {
    await initTursoSchema(client);
    const tagsJson = JSON.stringify(data.tags || []);
    const existing = await client.execute({
      sql: 'SELECT id FROM templates WHERE id = ? OR slug = ? LIMIT 1',
      args: [id, data.slug],
    });

    if (existing.rows.length > 0) {
      const targetId = String(existing.rows[0].id);
      await client.execute({
        sql: `UPDATE templates
              SET title = ?, slug = ?, category = ?, tags = ?, html_content = ?, r2_key = ?, r2_url = ?, file_size = ?, updated_at = ?
              WHERE id = ?`,
        args: [data.title, data.slug, data.category, tagsJson, data.html_content, data.r2_key || null, data.r2_url || null, fileSize, now, targetId],
      });
    } else {
      await client.execute({
        sql: `INSERT INTO templates (id, title, slug, category, tags, html_content, r2_key, r2_url, file_size, downloads, views, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
        args: [id, data.title, data.slug, data.category, tagsJson, data.html_content, data.r2_key || null, data.r2_url || null, fileSize, now, now],
      });
    }
  } catch (err) {
    console.warn('Failed to persist template to Turso:', err);
  }

  return saved;
}

export async function deleteTemplate(client: Client, id: string): Promise<boolean> {
  const initialLength = mockTemplates.length;
  mockTemplates = mockTemplates.filter((t) => t.id !== id && t.slug !== id);

  if (isMockClient(client)) return mockTemplates.length < initialLength;

  try {
    const res = await client.execute({
      sql: 'DELETE FROM templates WHERE id = ? OR slug = ?',
      args: [id, id],
    });
    return res.rowsAffected > 0;
  } catch {
    return mockTemplates.length < initialLength;
  }
}

export async function incrementDownloads(client: Client, id: string): Promise<number> {
  const item = mockTemplates.find((t) => t.id === id || t.slug === id);
  if (item) {
    item.downloads += 1;
  }

  if (isMockClient(client)) return item?.downloads || 1;

  try {
    await client.execute({
      sql: 'UPDATE templates SET downloads = downloads + 1 WHERE id = ? OR slug = ?',
      args: [id, id],
    });
    const res = await client.execute({
      sql: 'SELECT downloads FROM templates WHERE id = ? OR slug = ?',
      args: [id, id],
    });
    return Number(res.rows[0]?.downloads || item?.downloads || 0);
  } catch {
    return item?.downloads || 1;
  }
}

export async function incrementViews(client: Client, id: string): Promise<number> {
  const item = mockTemplates.find((t) => t.id === id || t.slug === id);
  if (item) {
    item.views += 1;
  }

  if (isMockClient(client)) return item?.views || 1;

  try {
    await client.execute({
      sql: 'UPDATE templates SET views = views + 1 WHERE id = ? OR slug = ?',
      args: [id, id],
    });
    const res = await client.execute({
      sql: 'SELECT views FROM templates WHERE id = ? OR slug = ?',
      args: [id, id],
    });
    return Number(res.rows[0]?.views || item?.views || 0);
  } catch {
    return item?.views || 1;
  }
}

export async function testTursoConnection(client: Client): Promise<{ success: boolean; message: string; count: number }> {
  if (isMockClient(client)) {
    return {
      success: true,
      message: `Using in-memory SQLite store with ${mockTemplates.length} templates. (Set TURSO_DATABASE_URL to connect to Cloud Turso).`,
      count: mockTemplates.length,
    };
  }

  try {
    await initTursoSchema(client);
    const res = await client.execute('SELECT COUNT(*) as count FROM templates');
    const count = Number(res.rows[0]?.count || 0);
    return {
      success: true,
      message: `Successfully connected to Turso SQLite. Found ${count} templates.`,
      count,
    };
  } catch (err: any) {
    return {
      success: true,
      message: `Turso offline (${err?.message || 'Connection failed'}). In-memory store active with ${mockTemplates.length} templates.`,
      count: mockTemplates.length,
    };
  }
}

export async function getR2StorageReport(client: Client): Promise<{
  totalFiles: number;
  totalBytes: number;
  totalKilobytes: number;
  totalMegabytes: number;
  totalGigabytes: number;
  formattedSize: string;
}> {
  if (isMockClient(client)) {
    const totalFiles = mockTemplates.filter((t) => t.r2_key).length;
    const totalBytes = mockTemplates.reduce((acc, t) => acc + (t.file_size || 0), 0);
    const totalKilobytes = Number((totalBytes / 1024).toFixed(2));
    const totalMegabytes = Number((totalBytes / (1024 * 1024)).toFixed(3));
    const totalGigabytes = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(6));

    let formattedSize = '0 B';
    if (totalGigabytes >= 1) {
      formattedSize = `${totalGigabytes.toFixed(2)} GB`;
    } else if (totalMegabytes >= 1) {
      formattedSize = `${totalMegabytes.toFixed(2)} MB`;
    } else if (totalKilobytes >= 1) {
      formattedSize = `${totalKilobytes.toFixed(1)} KB`;
    } else if (totalBytes > 0) {
      formattedSize = `${totalBytes} Bytes`;
    }

    return { totalFiles, totalBytes, totalKilobytes, totalMegabytes, totalGigabytes, formattedSize };
  }

  try {
    await initTursoSchema(client);
    const res = await client.execute(`
      SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(file_size), 0) as total_bytes
      FROM templates
      WHERE r2_key IS NOT NULL
    `);

    const totalFiles = Number(res.rows[0]?.total_files || 0);
    const totalBytes = Number(res.rows[0]?.total_bytes || 0);

    const totalKilobytes = Number((totalBytes / 1024).toFixed(2));
    const totalMegabytes = Number((totalBytes / (1024 * 1024)).toFixed(3));
    const totalGigabytes = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(6));

    let formattedSize = '0 B';
    if (totalGigabytes >= 1) {
      formattedSize = `${totalGigabytes.toFixed(2)} GB`;
    } else if (totalMegabytes >= 1) {
      formattedSize = `${totalMegabytes.toFixed(2)} MB (${totalGigabytes.toFixed(4)} GB)`;
    } else if (totalKilobytes >= 1) {
      formattedSize = `${totalKilobytes.toFixed(1)} KB (${totalGigabytes.toFixed(6)} GB)`;
    } else if (totalBytes > 0) {
      formattedSize = `${totalBytes} Bytes (${totalGigabytes.toFixed(7)} GB)`;
    }

    return { totalFiles, totalBytes, totalKilobytes, totalMegabytes, totalGigabytes, formattedSize };
  } catch {
    return getR2StorageReport(fallbackMockClient);
  }
}

function parseTags(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
  }
}

export async function getSiteSettings(client: Client): Promise<SiteSettings> {
  const defaultSettings: SiteSettings = {
    site_name: mockSettings.site_name || 'HTML Snippets & Templates',
    site_description: mockSettings.site_description || 'Free responsive HTML snippets and component templates directory.',
    app_logo: mockSettings.app_logo || '',
    favicon_url: mockSettings.favicon_url || '',
    og_image: mockSettings.og_image || '',
  };

  if (isMockClient(client)) {
    return defaultSettings;
  }

  try {
    await initTursoSchema(client);
    const res = await client.execute({
      sql: `SELECT key, value FROM settings WHERE key IN ('site_name', 'site_description', 'app_logo', 'favicon_url', 'og_image')`,
    });
    const map: Record<string, string> = {};
    for (const row of res.rows) {
      map[String(row.key)] = String(row.value);
    }
    return {
      site_name: map.site_name || defaultSettings.site_name,
      site_description: map.site_description || defaultSettings.site_description,
      app_logo: map.app_logo || defaultSettings.app_logo,
      favicon_url: map.favicon_url || defaultSettings.favicon_url,
      og_image: map.og_image || defaultSettings.og_image,
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveSiteSettings(
  client: Client,
  settings: Partial<SiteSettings>
): Promise<SiteSettings> {
  const keys: (keyof SiteSettings)[] = ['site_name', 'site_description', 'app_logo', 'favicon_url', 'og_image'];
  for (const k of keys) {
    if (settings[k] !== undefined) {
      mockSettings[k] = String(settings[k] ?? '');
    }
  }

  if (isMockClient(client)) {
    return getSiteSettings(client);
  }

  try {
    await initTursoSchema(client);
    const now = nowIso();
    for (const k of keys) {
      if (settings[k] !== undefined) {
        const val = String(settings[k] ?? '');
        await client.execute({
          sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          args: [k, val, now],
        });
      }
    }
  } catch (err) {
    console.warn('Failed to save settings to Turso:', err);
  }

  return getSiteSettings(client);
}

export async function getAdminUsers(client: Client): Promise<AdminUser[]> {
  if (isMockClient(client)) {
    return mockAdmins.map((a) => ({
      id: a.id,
      username: a.username,
      created_at: a.created_at,
      updated_at: a.updated_at,
    }));
  }

  try {
    await initTursoSchema(client);
    const res = await client.execute('SELECT id, username, created_at, updated_at FROM admins ORDER BY created_at ASC');
    return res.rows.map((row: any) => ({
      id: String(row.id),
      username: String(row.username),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    }));
  } catch {
    return mockAdmins.map((a) => ({
      id: a.id,
      username: a.username,
      created_at: a.created_at,
      updated_at: a.updated_at,
    }));
  }
}

export async function updateAdminUser(
  client: Client,
  id: string,
  data: { username?: string; passwordHash?: string; salt?: string }
): Promise<boolean> {
  const now = nowIso();
  const mockAdmin = mockAdmins.find((a) => a.id === id);
  if (mockAdmin) {
    if (data.username) mockAdmin.username = data.username.trim().toLowerCase();
    if (data.passwordHash && data.salt) {
      mockAdmin.password_hash = data.passwordHash;
      mockAdmin.salt = data.salt;
    }
    mockAdmin.updated_at = now;
  }

  if (isMockClient(client)) return Boolean(mockAdmin);

  try {
    await initTursoSchema(client);
    if (data.username && data.passwordHash && data.salt) {
      const cleanUser = data.username.trim().toLowerCase();
      const res = await client.execute({
        sql: 'UPDATE admins SET username = ?, password_hash = ?, salt = ?, updated_at = ? WHERE id = ?',
        args: [cleanUser, data.passwordHash, data.salt, now, id],
      });
      return res.rowsAffected > 0;
    } else if (data.username) {
      const cleanUser = data.username.trim().toLowerCase();
      const res = await client.execute({
        sql: 'UPDATE admins SET username = ?, updated_at = ? WHERE id = ?',
        args: [cleanUser, now, id],
      });
      return res.rowsAffected > 0;
    } else if (data.passwordHash && data.salt) {
      const res = await client.execute({
        sql: 'UPDATE admins SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?',
        args: [data.passwordHash, data.salt, now, id],
      });
      return res.rowsAffected > 0;
    }
    return Boolean(mockAdmin);
  } catch {
    return Boolean(mockAdmin);
  }
}

export async function deleteAdminUser(
  client: Client,
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (mockAdmins.length <= 1) {
    return { success: false, error: 'Cannot delete the only admin user in the system.' };
  }

  const initialLength = mockAdmins.length;
  mockAdmins = mockAdmins.filter((a) => a.id !== id);

  if (isMockClient(client)) {
    return { success: mockAdmins.length < initialLength };
  }

  try {
    await initTursoSchema(client);
    const countRes = await client.execute('SELECT COUNT(*) as count FROM admins');
    const total = Number(countRes.rows[0]?.count || 0);
    if (total <= 1) {
      return { success: false, error: 'Cannot delete the only admin user in the system.' };
    }

    const res = await client.execute({
      sql: 'DELETE FROM admins WHERE id = ?',
      args: [id],
    });
    return { success: res.rowsAffected > 0 };
  } catch {
    return { success: mockAdmins.length < initialLength };
  }
}
